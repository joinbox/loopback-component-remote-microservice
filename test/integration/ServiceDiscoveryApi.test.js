const { expect } = require('chai');

const { RemoteMicroserviceError } = require('../../src/error');
const ServiceDiscoveryApi = require('../../src/ServiceDiscoveryApi');

describe('The ServiceDiscoveryApi ', () => {

    before('setup discovery', function() {
        this.baseURL = 'http://0.0.0.0:3000/';
        this.restApiRoot = `${this.baseURL}api`;
        this.settings = {
            restApiRoot: this.restApiRoot,
        };
        this.discoveryApi = new ServiceDiscoveryApi(this.service.app, this.settings);
    });

    it('#restApiRoot: returns the configured rest api root or the rest api root of the app', function() {
        expect(this.discoveryApi.restApiRoot).to.be.equal(this.restApiRoot);
    });

    it('#getRequestHandler: throws an error if the discovery api was not installed before ' +
        '(if configured accordingly)', function() {
        expect(() => this.discoveryApi.getRequestHandler()).to.throw(RemoteMicroserviceError);
    });

    it('#getRequestHandler: returns a middleware callback even if not installed ' +
        '(if configured accordingly using `ensureInstallation`:false)', () => {
        const app = { models: {}, get() {} };
        const settings = { ensureInstallation: false };
        const discoveryApi = new ServiceDiscoveryApi(app, settings);

        const handler = discoveryApi.getRequestHandler();

        expect(handler).to.be.a('function');
    });

    it('#addRemoteMethod: adds a method `getDiscoveryDefinition` to the passed model and adds ' +
        'a remote method', function() {
        const modelDummy = {
            calls: [],
            remoteMethod() {
                const argArray = [...arguments];
                modelDummy.calls.push(argArray);
            },
        };
        this.discoveryApi.addRemoteMethod(modelDummy);
        expect(modelDummy).to.have.property('getDiscoveryDefinition').that.is.a('function');
        expect(modelDummy.calls).to.have.length(1);

        const [call] = modelDummy.calls;
        expect(call).to.be.deep.equal([
            'getDiscoveryDefinition',
            {
                returns: [
                    { arg: 'body', type: 'json', root: true },
                ],
                http: {
                    path: '/',
                    verb: 'OPTIONS',
                },
            },
        ]);
    });

    it('#formatModelSettings: prepares the settings of the model to be returned by the api', function() {
        const modelDummy = {
            definition: {
                settings: {
                    test: true,
                },
                rawProperties: {
                    id: {
                        id: 1,
                    },
                },
            },
            modelName: 'Dummy',
        };
        const result = this.discoveryApi.formatModelSettings(modelDummy);
        expect(result).to.deep.equal({
            name: 'Dummy',
            test: true,
            properties: {
                id: {
                    id: 1,
                },
            },
        });
    });

    // @note: decorating the models after the server is started does not work!
    it.skip('#install: decorates the resource endpoints of the models to return their definition, ' +
        'consisting of the settings, the properties and the model name (similar to a raw model ' +
        'definition in a json file. One can modify the response by adding a method called ' +
        'getDiscoveryDefinition to the model. We need to test that explicitly as an integration ' +
        'of the component.', async function() {

        this.discoveryApi.install();

        const booksDefinition = await makeOptionsRequest('/books', this.service.api);
        const publisherDefinition = await makeOptionsRequest('/publishers', this.service.api);
        const authorDefinition = await makeOptionsRequest('/authors', this.service.api);

        expect(booksDefinition).to.have.property('name', 'Book');
        expect(booksDefinition)
            .to.have.property('properties')
            .that.has.property('id').that.is.deep.equal({
                generated: true,
                id: 1,
                updateOnly: true,
            });

        expect(publisherDefinition).to.have.property('name', 'Publisher');
        expect(publisherDefinition)
            .to.have.property('properties')
            .that.has.property('id').that.is.deep.equal({
                generated: true,
                id: 1,
                updateOnly: true,
            });

        expect(authorDefinition).to.be.ok;
    });
});

async function makeOptionsRequest(url, request) {
    return request
        .options(url)
        .set('accept', 'application/json')
        .then(response => response.body);
}
