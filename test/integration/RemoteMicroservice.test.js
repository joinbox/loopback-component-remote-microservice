const { expect } = require('chai');

const RemoteMicroservice = require('../../src/RemoteMicroservice');

const resourceDiscoveryResponse = require('../support/fixtures/resourceDiscoveryResponse');

describe('The RemoteMicroservice ', () => {

    before(function() {
        this.baseURL = 'http://0.0.0.0:3000';
        this.discoveryURL = `${this.baseURL}/discovery`;
        this.component = this.service.app.get('remote-microservice');
    });

    it('is exposed on the app as "remote-microservice"', function() {
        const component = this.service.app.get('remote-microservice');
        expect(component).to.be.instanceOf(RemoteMicroservice);
    });

    it('can be instantiated passing in the app, the service discovery ' +
        'and settings', () => {
        const remoteMicroservice = new RemoteMicroservice({}, {}, {});
    });

    it('installs the discovery api at the configured root path with the specified method ' +
        '(default is path: "/" and method: "OPTIONS")', async function() {
        const result = await this
            .service
            .api
            .request
            .get(this.discoveryURL)
            .then(response => response.body);

        expect(result).to.deep.equal({
            restApiRoot: '/api',
            resources: resourceDiscoveryResponse(),
        });
    });

    it('decorates all the model routes to return their definitions', async function() {
        const result = await this
            .service
            .api
            .request
            .get(this.discoveryURL)
            .then(response => response.body);

        const promises = result.resources.map(resource => this.service.api.options(resource.path).then(response => response.body));

        const results = await Promise.all(promises);
        const bookResult = results.find(entry => entry.name === 'Book');
        const authorResult = results.find(entry => entry.name === 'Author');
        const publisherResult = results.find(entry => entry.name === 'Publisher');

        expect(bookResult).to.be.ok;
        expect(authorResult).to.be.ok;
        expect(publisherResult).to.be.ok;
    });

    it('#getService(serviceName): provides a method to access a service client ' +
        '(the service is discovered at run time) which exposes the rest-models', async function() {
        // todo adjust the service config to point to the currently running instance
        const service = await this.component.getService('test.jb');
        expect(service).to.have.property('models');

        const models = service.models;
        expect(models).to.have.property('Book').that.is.ok;
        expect(models).to.have.property('Author').that.is.ok;
        expect(models).to.have.property('Publisher').that.is.ok;

    });

    it('#getService(serviceName): the rest models provide access to data', async function() {
        // todo adjust the service config to point to the currently running instance
        const service = await this.component.getService('test.jb');
        const Author = service.models.Author;
        // this now accesses the currently running instance over the rest api
        const result = await Author.find({ filter: { where: { lastName: { like: 'Orw%' } } } });
        expect(result).to.have.length(1);
    });

    it('#get(serviceName): is a shortcut for getService', async function() {
        // todo adjust the service config to point to the currently running instance
        const service = await this.component.get('test.jb');
        const Author = service.models.Author;
        // this now accesses the currently running instance over the rest api
        const result = await Author.find({ filter: { where: { firstName: { like: 'S%' } } } });
        expect(result).to.have.length(2);
    });

    it('#getService(serviceName): the rest models provide access to data ' +
        'whereas the underlying rest data source normalizes the access to the query syntax', async function() {
        // todo adjust the service config to point to the currently running instance
        const service = await this.component.getService('test.jb');
        const Book = service.models.Book;
        // this now accesses the currently running instance over the rest api
        const result = await Book.find({ where: { title: { like: 'The%' } } });
        expect(result).to.have.length(2);
    });
});
