// @todo: add a configuration for the discovery endpoints
// the root endpoint for the discovery can be freely configured (method and path)
// default is OPTIONS '/'
// (but has to be configured on the client)

const { RemoteMicroserviceError } = require('./error');

const defaultConfig = {
    rootPath: '/',
    method: 'OPTIONS',
    ensureInstallation: true,
    resources: [],
};

module.exports = class ServiceDiscoveryApi {

    constructor(app, settings = {}) {
        const restApiRoot = app.get('restApiRoot');
        this.app = app;
        this.models = app.models;
        this.settings = Object.assign.call({}, { restApiRoot }, defaultConfig, settings);
        this._installed = false;
    }

    get endpoints() {
        return this.getResourceEndpoints(this.app);
    }

    get restApiRoot() {
        return this.settings.restApiRoot;
    }

    getResourceEndpoints(app) {
        return app
            .remotes()
            .classes()
            .map((entry) => {
                const modelPath = entry.http.path;
                return {
                    name: entry.name,
                    path: `${modelPath}`,
                };
            });
    }

    /**
     * Returns the request handler which can be hooked into the loopback application.
     *
     * @returns {function(*=, *=, *)}
     */
    getRequestHandler() {
        if (this._installed === false
            && this.settings.ensureInstallation === true) {
            const message = 'The discovery did not properly install the remote method handlers for' +
                ' each resource, therefore the client might not be able to load their definitions.' +
                ' Either call the install method of the discovery upfront, or set the' +
                ' ensureInstallation option to false';

            throw new RemoteMicroserviceError(message);
        }
        return async(req, res, next) => {
            try {
                await this.handleRequest(req, res);
            } catch (err) {
                next(err);
            }
        };
    }

    addRemoteMethod(model) {
        const component = this;
        // check if the method already exists:
        // if not, we assume that the model was customized to deliver a specific format
        if (typeof model.getDiscoveryDefinition !== 'function') {
            model.getDiscoveryDefinition = function(cb) {
                cb(null, component.formatModelSettings(model));
            };
        }
        model.remoteMethod('getDiscoveryDefinition', {
            returns: [
                { arg: 'body', type: 'json', root: true },
            ],
            http: {
                path: '/',
                verb: 'OPTIONS',
            },
        });
    }

    formatModelSettings(model) {
        const settings = Object.assign({}, model.definition.settings);
        settings.name = model.modelName;
        settings.properties = model.definition.rawProperties;
        return settings;
    }

    /**
     * Adds a remote method to all the specified resource endpoints (eg: OPTIONS /api/books)
     * returning the result of model.getDiscoveryDefinition.
     *
     * If the model already has a getDiscoveryDefinition method, we assume that the method is
     * customized to return a custom format.
     *
     * @param   endpoints array of all the enpoints provided by the rest api, containing model name
     *          and the path relative to the restApiRoot
     */
    decorateModelEndpoints() {
        this.endpoints.forEach((entry) => {
            const model = this.app.models[entry.name];
            this.addRemoteMethod(model);
        });
    }

    install() {
        if (this._installed === false) {
            this.decorateModelEndpoints();
            this._installed = true;
        }
    }

    async handleRequest(req, res) {
        const response = {
            restApiRoot: this.restApiRoot,
            resources: this.endpoints,
        };
        return res
            .status(200)
            .send(response);
    }
};
