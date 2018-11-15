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
        this.settings = Object.assign.call({}, {
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
        const modelSettings = this.settings.models || {};
        const exposeAllModels = Object.keys(modelSettings).length === 0;

        return app
            .remotes()
            .classes()
            .filter((entry) => exposeAllModels || modelSettings[entry.name] === true)
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
    getServiceDiscoveryDefinition(){
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
     * @todo: test
     *
     * @param model
     * @return {*}
     */
    getModelDiscoveryDefinition(model) {
        const {
            sharedClass,
            definition,
        } = model;

        // Entrypoint to customize the behavior of a model
        if (typeof model.getDiscoveryDefinition === 'function') {
            return model.getDiscoveryDefinition();
        }

        // We need to properly convert the definition to a plain object to ensure it can be
        // properly serialized.
        const {
            properties,
            settings,
        } = definition.toJSON();

        return {
            name: model.modelName,
            http: sharedClass.http,
            properties,
            methods: settings.methods || {},
            relations: settings.relations || {},
        };
    }
};
