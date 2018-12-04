const { MicroserviceApiClient } = require('@joinbox/loopback-microservice');

const ComponentConfig = require('./ComponentConfig.js');

const {
    ConnectionError,
    DiscoveryNotSupportedError,
    DiscoveryMaxDelayError,
    ConnectionMaxDelayError,
} = require('./errors.js');

/**
 * @todo: separate connecting and discovery
 * @type {module.ServiceClient}
 */
module.exports = class ServiceClient extends MicroserviceApiClient {

    constructor(config, dataSource) {
        super(config.url);

        const apiUrl = this.createEndpoint(config.restApiRoot || '');

        this.config = config;
        this.serviceName = config.name;
        this.dataSource = dataSource;
        this.api = new MicroserviceApiClient(apiUrl);

        this._connected = null;
        this._discovered = null;
        this._models = {};
    }

    get supportsConnecting() {
        return this.supportsDiscovery;
    }

    get supportsDiscovery() {
        return !!(this.config.discovery && this.config.discovery.disabled !== true);
    }

    get autoDiscoveryEnabled() {
        return this.supportsDiscovery && this.config.discovery.autoDiscover === true;
    }

    /**
     * Expose the models.
     * Welcome to loopback: it will expose all models on all data sources!!
     * @return {{}|*}
     */
    get models() {
        return this._models;
    }

    invoke(method, ...args) {
        const methodName = method.toLowerCase();
        return this[methodName].call(this, ...args);
    }

    _ensureDiscoverability() {
        if (!this.supportsDiscovery) {
            const msg = `No discovery enabled to connect to for service "${this.serviceName}"`;
            throw new DiscoveryNotSupportedError(msg);
        }
    }

    /**
     * Connects to the service and consumes its discovery if possible.
     *
     * The discovery information will be used to define the models on the given dataSource.
     *
     * @return {Promise<ServiceClient>} - the current client
     */
    async discover(restart = false) {
        if (this._discovered && restart !== true) {
            return this._discovered;
        }

        this._ensureDiscoverability();

        this._discovered = this._discoverService();
        return this._discovered;
    }

    async _discoverService() {
        try {
            // for now we are using the cached response from the connecting process
            const { models } = await this.connect();
            const modelsConfig = this.config.discovery.models;

            models.forEach((definition) => {
                const { name } = definition;
                if (ComponentConfig.modelIsExposed(name, modelsConfig)) {
                    const model = this._defineModel(definition, modelsConfig);
                    this._models[name] = model;
                }
            });
            return this;
        } catch (error) {
            if (error instanceof ConnectionMaxDelayError) {
                throw new DiscoveryMaxDelayError(error.message, { error });
            }
            throw error;
        }
    }

    /**
     * Hook the model into the app.
     *
     * If the model is configured to be global (via isGlobal property), it is mounted into the
     * application and avialable via app.models.ModelName (Default is true).
     *
     * If the model is configured to be public (via isPublic property), it is declared public
     * and exposed on the api of the consuming service (Default is false).
     *
     * @param {Object} definition
     * @param {Object} [modelsConfig] the models section of the service discovery section
     * @return {Model} - the loopback model
     *
     * @private
     */
    _defineModel(definition, modelsConfig) {
        const {
            name,
            properties,
            relations,
            http,
            methods,
        } = definition;

        const isPublic = ComponentConfig.modelIsPublic(name, modelsConfig);

        const model = this.dataSource.createModel(name, properties, {
            base: 'PersistedModel',
            http,
            methods,
            relations,
            public: isPublic
        });

        if (ComponentConfig.modelIsGlobal(name, modelsConfig)) {
            // expose the model on the app to make it shareable
            this.dataSource.app.model(model, {
                dataSource: this.dataSource,
                public: isPublic,
            });
        }

        return model;
    }

    /**
     * Connects to a service by repeate querying an endpoint.
     *
     * The requests will be repeated until a maximum delay (maxDelay) is reached, starting
     *
     * @return {Promise<{Object}>} - the response body of the enpoint
     */
    async connect(restart = false) {

        if (this._connected && restart !== true) {
            return this._connected;
        }

        this._ensureDiscoverability();

        this._connected = this._connectService(this.config.discovery);
        return this._connected;
    }

    async _connectService(options, nextDelay = 0) {

        const {
            method,
            pathname,
            maxDelay,
            delayFactor,
            delay,
            timeout,
        } = options;

        if (nextDelay > maxDelay) {
            const msg = `Maximal delay of ${maxDelay} reached`;
            throw new ConnectionMaxDelayError(msg);
        }

        try {
            // create and postpone the request
            // @note: timeout is a method of the superagent request
            const { body } = await this._timeout(() => this.invoke(method, pathname).timeout(timeout), nextDelay);
            return body;
        } catch (error) {
            if (this._shouldRetryConnecting(error)) {
                // compute the delay for the next connection attempt
                // prevent newDelay from being 0 forever using Math.max
                const newDelay = Math.max(nextDelay * delayFactor, delay);
                return this._connectService(options, newDelay);
            }
            const msg = `Unable to connect to service "${this.serviceName}": ${error.message}`;
            throw new ConnectionError(msg, { error });
        }
    }

    _shouldRetryConnecting(error) {
        const { code } = error;
        return code === 'ECONNREFUSED' ||
            code === 'ETIMEDOUT' ||
            code === 'ECONNRESET' ||
            code === 'ESOCKETTIMEDOUT';
    }

    async _timeout(cb, delay) {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve(cb());
            }, delay);
        });
    }
};
