const unitSetup = require('./unit');

before('start microservice', async function() {
    await this.service.start();
});
