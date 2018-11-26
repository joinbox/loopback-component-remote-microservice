const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

const Microservice = require('@joinbox/loopback-microservice');

const resolve_config = require('./resolve_config.js');

before('register chai-as-promised', () => {
    chai.use(chaiAsPromised);
});

before('boot microservice', async function() {
    const boot = resolve_config();

    this.service = await Microservice.boot({ boot });
});
