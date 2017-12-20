const connector = require('loopback-connector-rest');

const { RemoteMicroserviceError } = require('./error');

const ServiceClient = require('./ServiceClient');

module.exports = class RemoteMicroservice {

    constructor(app, discovery, settings) {
        this.app = app;
        // discover the service
        this.discovery = discovery;
        this.settings = settings;
        this._services = {};
    }

    /**
     * @todo: add a cache with a ttl
     *
     * @param serviceName
     * @returns {*}
     * @private
     */
    _getService(serviceName) {
        return this._services[serviceName];
    }

    async get(serviceName) {
        return this.getService(serviceName);
    }

    async getService(serviceName) {
        const serviceClientPromise = this._getService(serviceName);
        if (serviceClientPromise) {
            return serviceClientPromise;
        }
        const clientPromise = this.createServiceCient(serviceName);
        this._services[serviceName] = clientPromise;
        return clientPromise;

    }

    async createServiceCient(serviceName) {
        // loads the model definitions from the service
        // could fail because the service is not available or does not exist
        const lookup = await this.discovery.discover(serviceName);
        const settings = this.discovery.getServiceSetting(serviceName);
        return this.createClientFromLookup(this.app, lookup, settings);
    }

    /**
     * Creates models from definitions (such as the model.json files), usually
     * loaded over the api of the remote service.
     *
     * @param dataSource
     * @param definitions
     */
    attachModelDefinitionsToSource(dataSource, definitions) {
        definitions.forEach((definition) => {
            const { name, properties, settings } = this.formatDefinitionParameters(definition);
            dataSource.createModel(name, properties, settings);
        });
    }

    formatDefinitionParameters(definition) {
        const rawDefinition = definition.definition;
        // name of the model
        const name = definition.modelName;
        const properties = rawDefinition.properties;
        // for more information see:
        // https://loopback.io/doc/en/lb3/REST-connector.html#setting-the-resource-url
        // @note: we might have to pass more properties of the config
        const settings = {
            name,
            base: rawDefinition.base,
            resourceName: definition.resourceName,
        };
        return { name, properties, settings };
    }

    /**
     * Creates a data source using the rest connector.
     *
     * @param loopbackApp
     * @param baseURL
     * @param {debug}
     * @returns {dataSource}
     */
    createNormalizedRestSource(app, baseURL, { debug }) {
        const source = {
            debug,
            baseURL,
            connector,
        };

        const dataSource = app.loopback.createDataSource(source);
        return this.normalizeRestConnectorAccess(dataSource);
    }

    /**
     * Adds an observer to the rest-connector of the data source which
     * normalizes the passed query to fit the easier interface of e.g.
     * the postgres-connector.
     *
     * The rest-connector seems to have a different interface which requires
     * you to pass your query as a filter { filter: { where: {} }. On other
     * connectors/models one can pass the query part directly e.g.
     * { where: {} }.
     *
     * @param dataSource
     * @return dataSource
     */
    normalizeRestConnectorAccess(dataSource) {
        dataSource.connector.observe('before execute', (ctx, next) => {
            if (ctx.req.qs && !ctx.req.qs.filter) {
                ctx.req.qs = {
                    filter: Object.assign({}, ctx.req.qs),
                };
            }
            next();
        });
        return dataSource;
    }

    createClientFromRestURL(app, baseURL, definitions, { debug } = {}) {
        const dataSource = this.createNormalizedRestSource(app, baseURL, { debug });
        this.attachModelDefinitionsToSource(dataSource, definitions);
        return new ServiceClient(dataSource);
    }

    createClientFromLookup(app, lookup, options) {
        const { restApiRoot, definitions } = lookup;
        return this.createClientFromRestURL(app, restApiRoot, definitions, options);
    }

    static mount(app, component, { path = '/', method = 'OPTIONS' } = {}) {

        const accessor = method.toLowerCase();
        // create a router/sub-app to use
        const router = new app.loopback.Router();
        // instantiate the discovery
        component.install();
        // install the request handler of the discovery at the specified path
        router[accessor].call(router, path, component.getRequestHandler());
        // mount it into the app
        app.use(router);

        return component;
    }
};
