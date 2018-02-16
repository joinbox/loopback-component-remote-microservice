const { expect } = require('chai');
const nock = require('nock');

const { RemoteMicroserviceError } = require('../../src/error');
const ServiceDiscovery = require('../../src/ServiceDiscovery');

const resourceDiscoveryResponse = require('../support/fixtures/resourceDiscoveryResponse');

describe('The ServiceDiscovery class', () => {

    before('setup service discovery', function() {
        const settings = {
            'test.jb': {
            },
            'configuration.jb': {
                pathname: '/configuration',
                hostname: '0.0.0.0',
                port: 9999,
                method: 'GET',
                resources: [
                    'Book',
                ],
                // don't know how to test this parameter
                debug: false,
            },
        };
        this.discovery = new ServiceDiscovery(settings);
        this.resources = resourceDiscoveryResponse();
        this.definitions = [
            {
                name: 'Book',
                plural: 'books',
                // etc.
            },
            {
                name: 'Author',
                plural: 'authors',
                // etc.
            },
            {
                name: 'Publisher',
                plural: 'publishers',
                // etc.
            },
            {
                name: 'Page',
                plural: 'pages',
                // etc.
            },
        ];
    });

    describe('#getURL(serviceName, settings={}): ', function(){
        it('creates an URL for the service ' +
            'based on the passed settings',function(){
            const settings = {
                pathname: '/yay',
                port: 8888,
                hostname: '0.0.0.0',
                protocol: 'https'
            };
            const url = this.discovery.getURL('test.com', settings);
            expect(url).to.be.equal('https://0.0.0.0:8888/yay');
        });

        it('falls back to the service name if no hostname is specified', function(){
            const url = this.discovery.getURL('test.com');
            expect(url).to.be.equal('http://test.com');
        });
    });

    describe('#getServiceURL(serviceName, settings={}):', function(){

        it('uses the internal configuration', function(){
            const url = this.discovery.getServiceURL('configuration.jb');
            expect(url).to.be.equal('http://0.0.0.0:9999/configuration');
        });

        it('returns an url taking the service settings into account, ' +
            'but allows overriding parameters', function(){
            const url = this.discovery.getServiceURL('configuration.jb', {pathname: '/discovery', protocol: 'https'});
            expect(url).to.be.equal('https://0.0.0.0:9999/discovery');
        });

        it('returns an url taking the service settings into account', function(){
            const url = this.discovery.getServiceURL('test.jb');
            expect(url).to.be.equal('http://test.jb');
        });

        it('fails if the service is not configured', function(){
            expect(()=>this.discovery.getServiceURL('unknown.jb')).to.throw(RemoteMicroserviceError);
        });

    });

    it('#getRootDiscoveryURL: resolves the discovery url with defaults', function() {
        const url = this.discovery.getRootDiscoveryURL('test.jb');
        expect(url).to.be.equal('http://test.jb');
    });

    it('#filterRequiredResources: returns all resource entries ' +
        'if no resources to include are passed', function() {
        const resources = this.discovery.filterRequiredResources(this.resources);
        expect(resources).to.deep.equal(this.resources);
    });

    it('#filterRequiredResources: returns all resource entries ' +
        'that have the name given in the resources to include (case sensitive)', function() {
        const include = ['Book', 'Author'];
        const resources = this.discovery.filterRequiredResources(this.resources, include);

        expect(resources).to.have.length(2);
        expect(resources.find(resource => resource.name === 'Book')).to.be.ok;
        expect(resources.find(resource => resource.name === 'Author')).to.be.ok;
    });

    describe('#discover(serviceName)', function(){

        it('creates a dedicated error if it is not able to resolve the api', async function() {
            expect(this.discovery.discover('test.jb'))
                .to.eventually.be.rejectedWith(RemoteMicroserviceError);
        });

        it('resolves an object containing the apiURL ' +
            'and an array of resource/model definitions', async function() {
            const scope = nock('http://test.jb')
                .options('/')
                .reply(200, {
                    restApiRoot: '/api',
                    resources: [],
                });
            const result = await this.discovery.discover('test.jb');

            expect(result).to.have.property('restApiRoot', 'http://test.jb/api');
            expect(result).to.have.property('definitions').that.is.an('array');
        });

        it('fails with a dedicated error if the exposed resources are not reachable', async function() {
            const scope = nock('http://test.jb')
                .options('/')
                .reply(200, {
                    restApiRoot: '/api',
                    resources: this.resources,
                });

            return expect(this.discovery.discover('test.jb'))
                .to.eventually.be.rejectedWith(RemoteMicroserviceError);
        });

        it('loads all resource definitions exposed by the discovery if available ' +
            'and returns them together with the base information of the base api discovery', async function() {

            const baseURL = 'http://test.jb';
            const restApiRoot = `${baseURL}/api`;
            const expectedDefinitions = [];
            const scope = nock(baseURL);
            // return the resource definition
            scope.options('/')
                .reply(200, {
                    restApiRoot: '/api',
                    resources: this.resources,
                });

            this.resources.forEach((resourceEntry, index) => {
                expectedDefinitions.push({
                    definition: this.definitions[index],
                    modelName: resourceEntry.name,
                    resourceName: resourceEntry.path,
                });
                scope
                    .options(`/api${resourceEntry.path}`)
                    .reply(200, this.definitions[index]);
            });

            const result = await this.discovery.discover('test.jb');

            expect(result).to.have.property('restApiRoot', restApiRoot);
            expect(result).to.have.property('definitions').that.is.an('array');

            const loadedDefinitions = result.definitions;
            expect(loadedDefinitions).to.deep.equal(expectedDefinitions);
        });

        it('respects the configuration for the given service at the corresponding identifier:' +
            ' protocol, port, pathname, hostname, method, resources', async function() {

            const baseURL = 'http://0.0.0.0:9999';
            const restApiRoot = `${baseURL}/api`;
            // only Books
            const [bookDefinition] = this.definitions;
            const [bookResource] = this.resources;
            const expectedDefinitions = [
                {
                    definition: bookDefinition,
                    modelName: bookResource.name,
                    resourceName: bookResource.path,
                },
            ];
            const scope = nock(baseURL);
            scope.get('/configuration')
                .reply(200, {
                    restApiRoot: '/api',
                    resources: this.resources,
                });
            // mock the options call to the resource
            scope
                .options(`/api/books`)
                .reply(200, bookDefinition);

            const result = await this.discovery.discover('configuration.jb');

            expect(result).to.have.property('restApiRoot', restApiRoot);
            expect(result).to.have.property('definitions').that.is.an('array');

            const loadedDefinitions = result.definitions;
            expect(loadedDefinitions).to.deep.equal(expectedDefinitions);
        });
    });

});
