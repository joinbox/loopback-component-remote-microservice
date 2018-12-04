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

        before('create mock datasource', function(){
            const ds = {
                models: new Map(),
                createModel(name, properties, settings) {
                    const ctor = {};
                    this.models.set(ctor, settings);
                    return ctor;
                },
                app: {
                    models: new Map(),
                    model(ctor, settings) {
                        this.models.set(ctor, settings);
                    },
                },
            };
            this.ds = ds;
            // usually this configuration should be normalized!!
            this.modelsConfig = {
                ConfigFalse: false,
                ConfigTrue: true,
                ConfigPublic: {
                    expose: true,
                    isPublic: true,
                },
                ConfigEmpty: {},
                ConfigNegated: {
                    isPublic: true,
                    isGlobal: false,
                },
            };
            this.client = createClient(null, ds);
        });

        it('registers the model globally but not public if the config is set to true', function(){
            const name = 'ConfigTrue';
            const model = this.client._defineModel({ name }, this.modelsConfig);
            expect(this.ds.models.has(model)).to.be.equal(true);
            expect(this.ds.app.models.has(model)).to.be.equal(true);

            const settings = this.ds.app.models.get(model);
            expect(settings).to.have.property('public', false);
        });

        it('registers the model globally and public if set accordingly', function(){
            const name = 'ConfigPublic';
            const model = this.client._defineModel({ name }, this.modelsConfig);
            expect(this.ds.models.has(model)).to.be.equal(true);
            expect(this.ds.app.models.has(model)).to.be.equal(true);

            const settings = this.ds.app.models.get(model);
            expect(settings).to.have.property('public', true);
        });

        it('registers locally and and therefore the isGlobal has no effect', function(){
            const name = 'ConfigNegated';
            const model = this.client._defineModel({ name }, this.modelsConfig);
            expect(this.ds.models.has(model)).to.be.equal(true);
            // not available on the app
            expect(this.ds.app.models.has(model)).to.be.equal(false);
        });

    });

});
