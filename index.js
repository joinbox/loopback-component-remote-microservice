const errors = require('./src/errors.js');
const { mount } = require('./src/helpers.js');

const ComponentConfig = require('./src/ComponentConfig.js');
const RemoteMicroservice = require('./src/RemoteMicroservice');
const ServiceDiscoveryApi = require('./src/ServiceDiscoveryApi');

const { version } = require('./package.json');

module.exports = function(app, options) {

    const config = ComponentConfig.normalizeConfiguration(app, options);

    const component = new RemoteMicroservice(app, config);
    const {
        discovery,
        exposeAt,
    } = config;

    if (discovery && discovery.disabled !== true) {
        const started = new Date();
        const discoveryOptions = Object.assign({}, discovery, { version, started });
        const serviceDiscoveryApi = new ServiceDiscoveryApi(app, discoveryOptions);

        mount(app, serviceDiscoveryApi, discovery);
    }

    app.set(exposeAt, component);
};

module.exports.errors = errors;
