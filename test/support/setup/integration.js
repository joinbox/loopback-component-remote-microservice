const { fork } = require('child_process');
const { before } = require('mocha');

const unitSetup = require('./unit');

/**
 * Takes the execArgv array of a parent process and creates a corresponding array for a child
 * process which contains a new debug port (if present). This allows us to debug child processes.
 *
 * @param {Object} process - the process to extract the arguments
 * @param {Array} process.execArgv
 * @param {Integer} [process.debugPort]
 * @param {Integer} [portOffset=1] - offset to increase the debug por of the current process.
 *
 * @return {Array}
 */
function fixDebugArgs({ debugPort, execArgv }, portOffset = 1) {
    const hasBreak = execArgv.some(argument => argument.startsWith('--inspect-brk'));
    if (hasBreak && debugPort) {
        const nextPort = debugPort + portOffset;
        return [...execArgv, `--inspect=${nextPort}`];
    }
    return [...execArgv];
}

function forkRemoteService() {
    const path = require.resolve('./startRemoteService.js');
    const execArgv = fixDebugArgs(process);
    return fork(path, [], { execArgv });
}

before('start testing microservice', async function() {
    await this.service.start();
});

/**
 * Start the remote-microservice in a child process to prevent Loopback from sharing model data.
 */
before('start remote microservice', (done) => {
    const prc = forkRemoteService();
    prc.on('error', (err) => {
        console.error(err);
        done(new Error('Could not start child process'));
    });

    prc.on('message', (m)=> {
        if (m && m.identifier === 'service-error') {
            done(new Error(`Remote Service could not be booted: ${m.message}`));
        }
    });

    prc.on('message', (m) => {
        if (m === 'service-started') {
            console.info('Remote Service is started');
            done();
        }
    });

    process.on('exit', () => {
        prc.send('shutdown-service');
    });
});
