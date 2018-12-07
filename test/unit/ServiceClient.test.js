const { expect } = require('chai');
const { describe, it, before } = require('mocha');

const ServiceClient = require('../../src/ServiceClient');

const base = {
    url: 'http://test.com:8000/',
    name: 'client.test.jb',
    restApiRoot: '/api',
};

function createClient(config = {}, datasource = null) {
    const serviceConfig = Object.assign(
        {},
        base,
        config,
    );
    return new ServiceClient(serviceConfig, datasource);
}

describe('The ServiceClient class', () => {

    before('setup dummy data source', function() {
        this.dataSource = {
            models: {},
        };
    });

    it('takes a config object, a data source and sets up an api client', () => {
        const client = createClient({ restApiRoot: '' });

        expect(client).to.have.property('base', base.url);
        expect(client).to.have.property('api').that.has.property('base', base.url);
    });

    it('alters the api client url (and normalizes it) if a rest api root is specified', () => {
        const client = createClient();

        expect(client).to.have.property('base', base.url);
        expect(client).to.have.property('api').that.has.property('base', `${base.url}api/`);
    });

    it('exposes accessors to describe the connectivity of the client (configured)', () => {
        const clientWithoutDiscovery = createClient();
        const clientWithDiscovery = createClient({
            discovery: {
                autoDiscover: false,
            },
        });

        expect(clientWithDiscovery.supportsConnecting).to.equal(true);
        expect(clientWithDiscovery.supportsDiscovery).to.equal(true);
        expect(clientWithDiscovery.autoDiscoveryEnabled).to.equal(false);

        expect(clientWithoutDiscovery.supportsConnecting).to.equal(false);
        expect(clientWithoutDiscovery.supportsDiscovery).to.equal(false);
        expect(clientWithoutDiscovery.autoDiscoveryEnabled).to.equal(false);
    });

    describe('ServiceClient._defineModel(definition, modelsConfig)', () => {

        before('create mock datasource', async function(){
            const ds = {
                models: new Map(),
                createModel(name, properties, settings) {
                    this.models.set(name, settings);
                    return { modelName: name };
                },
                app: {
                    models: new Map(),
                    model(ctor, settings) {
                        this.models.set(ctor.modelName, settings);
                    },
                },
            };
            this.ds = ds;
            this.modelDiscovery = {
                models: [
                    {
                        name: 'ConfigFalse',
                    },
                    {
                        name: 'ConfigTrue',
                    },
                    {
                        name: 'ConfigNoExpose',
                    },
                    {
                        name: 'ConfigPublic',
                    },
                    {
                        name: 'ConfigEmpty',
                    },
                    {
                        name: 'ConfigNegated',
                    },
                ],
            };
            // usually this configuration should be normalized!!
            this.modelsConfig = {
                ConfigFalse: false,
                ConfigTrue: true,
                ConfigNoExpose: {
                    expose: false,
                },
                ConfigPublic: {
                    isPublic: true,
                },
                ConfigEmpty: {},
                ConfigNegated: {
                    isPublic: true,
                    isGlobal: false,
                },
            };
            this.client = createClient({
                discovery: {
                    models: this.modelsConfig,
                },
            }, ds);
            // bypass the discovery
            this.client._connected = Promise.resolve(this.modelDiscovery);

            await this.client.discover();
        });

        it('registers the model globally and private by default', function(){
            const name = 'ConfigEmpty';
            expect(this.ds.models.has(name)).to.be.equal(true);
            expect(this.ds.app.models.has(name)).to.be.equal(true);
            expect(this.ds.app.models.get(name)).to.have.property('public', false);

            expect(this.client.models).to.have.property(name);
        });

        it('registers the model globally but not public if the config is set to true', function(){
            const name = 'ConfigTrue';
            expect(this.ds.models.has(name)).to.be.equal(true);
            expect(this.ds.app.models.has(name)).to.be.equal(true);
            expect(this.ds.app.models.get(name)).to.have.property('public', false);

            expect(this.client.models).to.have.property(name);
        });

        it('does not register the model if it is set to false', function(){
            const name = 'ConfigFalse';
            expect(this.ds.models.has(name)).to.be.equal(false);
            expect(this.ds.app.models.has(name)).to.be.equal(false);

            expect(this.client.models).to.not.have.property(name);
        });

        it('does not register the model if expose is set to false', function(){
            const name = 'ConfigNoExpose';
            expect(this.ds.models.has(name)).to.be.equal(false);
            expect(this.ds.app.models.has(name)).to.be.equal(false);

            expect(this.client.models).to.not.have.property(name);
        });

        it('registers the model publicly if isPublic is set to true', function(){
            const name = 'ConfigPublic';
            expect(this.ds.models.has(name)).to.be.equal(true);
            expect(this.ds.app.models.has(name)).to.be.equal(true);
            expect(this.ds.app.models.get(name)).to.have.property('public', true);
            expect(this.client.models).have.property(name);
        });

        it('registers the model locally and and therefore the isGlobal has no effect', function(){
            const name = 'ConfigNegated';
            expect(this.ds.models.has(name)).to.be.equal(true);
            expect(this.ds.app.models.has(name)).to.be.equal(false);
            expect(this.client.models).have.property(name);
        });

    });

});
