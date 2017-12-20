const error = require('./src/error');

const RemoteMicroservice = require('./src/RemoteMicroservice');

const ServiceDiscoveryApi = require('./src/ServiceDiscoveryApi');
const ServiceDiscovery = require('./src/ServiceDiscovery');

module.exports = function(app, options){

    const discovery = new ServiceDiscovery(options.services);
    const component = new RemoteMicroservice(app, discovery, options);

    if(options.api && options.api.disabled !== true){
        const serviceDiscoveryApi = new ServiceDiscoveryApi(app, options.api);
        RemoteMicroservice.mount(app, serviceDiscoveryApi, options.api);
    }

    app.set('remote-microservice', component);
};

module.exports.error = error;
