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
        config);
    return new ServiceClient(serviceConfig, datasource);
}

describe('The ServiceClient class', () => {

    before('setup dummy data source', function() {
        this.dataSource = {
            models: {},
        };
    });

    it('takes a config object, a data source and sets up an api client', function() {
        const client = createClient({ restApiRoot: ''});

        expect(client).to.have.property('base', base.url);
        expect(client).to.have.property('api').that.has.property('base', base.url);
    });

    it('alters the api client url (and normalizes it) if a rest api root is specified', function() {
        const client = createClient();

        expect(client).to.have.property('base', base.url);
        expect(client).to.have.property('api').that.has.property('base', `${base.url}api/`);
    });

    it('exposes accessors to describe the connectivity of the client (configured)', function() {
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

});
