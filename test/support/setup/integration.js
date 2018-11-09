const unitSetup = require('./unit');

const { fork } = require('child_process');

function fixDebugArgs(args = [], portOffset = 1) {
    const hasBreak = args.some(argument => argument.startsWith('--inspect-brk'));
    const { debugPort } = process;
    if (hasBreak && debugPort) {
        const nextPort = debugPort + portOffset;
        return [...args, `--inspect=${nextPort}`];
    }
    return args;
}

function forkRemoteService() {
    const path = require.resolve('./startRemoteService.js');
    const execArgv = fixDebugArgs(process.execArgv);
    return fork(path, [], { execArgv });
}

before('start microservice', async function() {
    // @todo: this is dangerous since these services will share information
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

    prc.on('message', (m, error)=> {
        if (m && m.identifier === 'service-error') {
            done(new Error(`Service could not be booted: ${m.message}`));
        }
    });

    prc.on('message', (m) => {
        if (m === 'service-started') {
            console.log('message, service-started');
            done();
        }
    });

    process.on('exit', () => {
        prc.send('shutdown-service');
    });
});
