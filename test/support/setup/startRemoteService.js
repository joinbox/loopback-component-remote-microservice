const console = require('console');

const Microservice = require('@joinbox/loopback-microservice');

const resolve_config = require('./resolve_config.js');

const boot = resolve_config('remote');

boot.bootDirs.unshift('loopback-dummy-project/boot');

(async () => {
    try {
        const service = await Microservice.start({ boot });
        process.send('service-started');
        process.on('message', async (m) => {
            if(m === 'shutdown-service') {
                console.log('shutdown remote service');
                await service.stop();
                process.send('service-stopped');
                process.exit(0);
            }
        });
    } catch (error) {
        console.error(error);
        process.send({
            identifier: 'service-error',
            message: error.message,
        });
        process.exit(1);
    }
})();
