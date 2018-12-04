const Microservice = require('@joinbox/loopback-microservice');

const resolve_config = require('../setup/resolve_config.js');

const { fork } = require('child_process');

function fixDebugArgs({ debugPort, execArgv }, portOffset = 1) {
    const hasBreak = execArgv.some(argument => argument.startsWith('--inspect-brk'));
    if (hasBreak && debugPort) {
        const nextPort = debugPort + portOffset;
        return [...execArgv, `--inspect=${nextPort}`];
    }
    return [...execArgv];
}

function forkRemoteService() {
    const path = require.resolve('../setup/startRemoteService.js');
    const execArgv = fixDebugArgs(process);
    return fork(path, [], { execArgv });
}


(async() => {
    const boot = resolve_config('debug');
    const localService = await Microservice.boot({ boot });
    const prc = forkRemoteService();

    prc.on('error', (err) => {
        console.error(err);
        process.exit(0);
    });

    prc.on('message', (m)=> {
        if (m && m.identifier === 'service-error') {
            console.error(`Remote Service could not be booted: ${m.message}`);
            process.exit(0);
        }
    });

    prc.on('message', (m) => {
        if (m === 'service-started') {
            console.info('Remote Service is started');
            localService.start()
                .then(()=>{
                    console.log('Local service started');
                })
                .catch((err) => {
                    console.error(err);
                    process.exit(0);
                });
        }
    });

    process.on('exit', () => {
        prc.send('shutdown-service');
    });
})()

