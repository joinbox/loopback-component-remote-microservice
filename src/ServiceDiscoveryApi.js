const ComponentConfig = require('./ComponentConfig.js');

/**
 * Class that assembles the data required to discover the current service.
 *
 * Will be hooked in by the component if configured accordingly.
 *
 * @type {module.ServiceDiscoveryApi}
 */
module.exports = class ServiceDiscoveryApi {

    /**
     * @param {*} app - Loopback app
     * @param {Object} settings
     * @param {String} [settings.restApiRoot] - defaults to the api root configured on the app
     */
    constructor(app, settings = {}) {
        const restApiRoot = app.get('restApiRoot');
        this.app = app;
        this.models = app.models;
        this.settings = Object.assign({
            restApiRoot,
            version: '1.0.0',
            started: new Date(),
        }, settings);
    }

    /**
     * @return {String}
     */
    get restApiRoot() {
        return this.settings.restApiRoot;
    }

    /**
     * Extracts the definitions of all mdoels exposed via rest api.
     *
     * @param app the Loopback app
     * @return {Array}
     */
    getModelDefinitions(app) {
        const modelSettings = this.settings.models;

        return app
            .remotes()
            .classes()
            .filter(({ name }) => ComponentConfig.modelIsExposed(name, modelSettings))
            .map((entry) => {
                const model = app.models[entry.name];
                return this.getModelDiscoveryDefinition(model);
            });
    }

    /**
     * Assembles the data which can be consumed by the remote service.
     *
     * Returns the relative restApiRoot (as configured by the app), the version of the package
     * (not used yet, to ensure compatibility in the future) and the definitions used to create
     * models in the remote service.
     *
     * @return {{models: Array, restApiRoot: String, version: String}}
     */
    getServiceDiscoveryDefinition() {
        const {
            version,
            started,
            restApiRoot,
        } = this.settings;
        // load the model definitions at runtime to make sure all the models are published
        const models = this.getModelDefinitions(this.app);
        return {
            models,
            restApiRoot,
            started,
            version,
        };
    }

    /**
     * Extracts a normalized representation of the model definition.
     *
     * This representation is used to generate the models in a remote service. To customize
     * this behavior on a per model base, one can add a `getDiscoveryDefinition` to the model.
     *
     * @param model
     * @return {*}
     */
    getModelDiscoveryDefinition(model) {

        // Entrypoint to customize the behavior of a model
        if (typeof model.getDiscoveryDefinition === 'function') {
            return model.getDiscoveryDefinition();
        }

        const {
            sharedClass,
            definition,
            modelName,
        } = model;

        // We need to properly convert the definition to a plain object to ensure it can be
        // properly serialized.
        const {
            properties,
            settings,
        } = definition.toJSON();

        return {
            name: modelName,
            // Loopback allows us to override the settings for the endpoints in the
            // model-config.json. Nevertheless, strong remoting seems to ignore them.
            // The correct way to get the http configuration would be via settings.http
            http: sharedClass.http,
            properties,
            methods: this.formatMethodDefinitions(settings.methods),
            relations: settings.relations || {},
        };
    }

    /**
     * Consumes additional configuration on the remote-method definition's accepts property to be
     * suitable for remote-services.
     *
     * @param {Object} methods
     * @return {Object}
     */
    formatMethodDefinitions(methods = {}) {
        return Object.entries(methods)
            .reduce((newDefinitions, [methodName, methodDefinition]) => {
                // eslint-disable-next-line no-param-reassign
                newDefinitions[methodName] = this._formatMethodDefinition(methodDefinition);
                return newDefinitions;
            }, {});
    }

    _formatMethodDefinition(methodDefinition) {

        const { accepts } = methodDefinition;

        if (!accepts) {
            return methodDefinition;
        }
        // make sure accepts is an array
        const originalAccepts = Array.isArray(accepts)
            ? accepts
            : [accepts];
        // expand the configuration for methods consumed by remote-clients
        const remoteMethodArgs = this._formatRemoteMethodArgs(originalAccepts);
        return Object.assign(
            {},
            methodDefinition,
            {
                accepts: remoteMethodArgs,
            },
        );
    }

    _formatRemoteMethodArgs(originalAccepts = []) {
        const newArguments = [];
        originalAccepts.forEach((argDefinition) => {
            newArguments.push(...this._formatRemoteMethodArg(argDefinition));
        });
        return newArguments;
    }

    _formatRemoteMethodArg(originalArgumentDefinition) {
        const { remote } = originalArgumentDefinition;
        // no special configuration for remote services found
        if (!remote) {
            return [originalArgumentDefinition];
        }

        const { preserveOriginal } = remote;
        // arguments defined for remote services
        const remoteAccepts = remote.accepts || [];

        if (preserveOriginal === false) {
            return remoteAccepts;
        }

        return [...remoteAccepts, originalArgumentDefinition];
    }
};
