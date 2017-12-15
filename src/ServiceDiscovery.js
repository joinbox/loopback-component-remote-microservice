const url = require('url');
const superagent = require('superagent');

const { RemoteMicroserviceError } = require('./error');

/**
 * Look Up the remote-microservice
 */
module.exports = class ServiceDiscovery {

    constructor(serviceSettings = {}) {
        this.services = serviceSettings;
    }

    getServiceSetting(serviceName) {
        return this.services[serviceName];
    }

    ensureServiceSetting(serviceName) {
        const settings = this.getServiceSetting(serviceName);
        if (!settings) {
            const message = `ServiceDiscovery was not able to find settings for service ${serviceName}, please add it to your component config`;
            throw new RemoteMicroserviceError(message);
        }
        return settings;
    }

    async discover(serviceName) {

        const serviceSetting = this.ensureServiceSetting(serviceName);
        const discoveryURL = this.getRootDiscoveryURL(serviceName);
        const apiLookup = await this.discoverAPI(discoveryURL, serviceSetting.method);
        const restApiRoot = this.getServiceURL(serviceName, {pathname: apiLookup.restApiRoot});
        const definitions = await this.discoverResources(restApiRoot, apiLookup, serviceSetting);

        return {
            restApiRoot,
            definitions,
        };
    }

    async discoverAPI(discoveryURL, method = 'options') {
        try {
            return await superagent(method, discoveryURL)
                .set('accept', 'application/json')
                .then(response => response.body);
        } catch (err) {
            const message = `Discovering Microservice at ${discoveryURL} failed with "${err.message}"`;
            throw new RemoteMicroserviceError(message, { err });
        }
    }

    async discoverResources(restApiRoot, apiLookup, settings) {

        const { resources } = apiLookup;
        const requiredResources = this.filterRequiredResources(resources, settings.resources);
        const resourceDefinitions = requiredResources
            .map(resourceEntry => this.discoverResource(restApiRoot, resourceEntry));

        return Promise.all(resourceDefinitions);
    }

    async discoverResource(baseURL, resourceEntry) {
        const fullURL = `${baseURL}${resourceEntry.path}`;
        const definition = await this.discoverAPI(fullURL);
        return {
            definition,
            modelName: resourceEntry.name,
            resourceName: resourceEntry.path,
        };
    }

    filterRequiredResources(resourcesFromApi, resourcesToInclude = []) {
        if (resourcesToInclude.length === 0) {
            return resourcesFromApi;
        }
        return resourcesFromApi
            .filter(resource => resourcesToInclude.indexOf(resource.name) !== -1);

    }

    getServiceURL(serviceName, params = {}){
        const settings = this.ensureServiceSetting(serviceName);
        const parameters = Object.assign({}, settings, params);

        return this.getURL(serviceName, parameters);
    }

    getURL(serviceName, {
        protocol = 'http', port, pathname, hostname,
    } = {}) {
        const targetHost = hostname || serviceName;
        const urlTemplate = {
            hostname: targetHost,
            pathname,
            protocol,
            port,
        };
        return url.format(urlTemplate);
    }

    getRootDiscoveryURL(serviceName) {
        return this.getServiceURL(serviceName);
    }
};
