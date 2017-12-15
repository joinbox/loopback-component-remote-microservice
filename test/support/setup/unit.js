const path = require('path');
const Microservice = require('loopback-microservice');

before('boot microservice', async function() {
    const options = {
        appRootDir: path.resolve(__dirname, '../server'),
        env: 'test',
    };
    this.service = await Microservice.boot(options);
});
