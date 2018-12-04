const { expect } = require('chai');
const { before, describe, it } = require('mocha');

const {
    ServiceNotFoundError,
    ConnectionMaxDelayError,
    DiscoveryNotSupportedError,
    DiscoveryMaxDelayError,
} = require('../../src/errors.js');

const RemoteMicroservice = require('../../src/RemoteMicroservice');

describe('The RemoteMicroservice Component', () => {

    before('get the component', function() {
        this.remoteServiceName = 'remote.jb';
        this.remoteServiceWithoutDiscovery = 'remote.without-connection.jb';
        this.remoteUnavailable = 'remote.unavailable.jb';
        this.remoteWithoutAutoDiscovery = 'remote.without-autodiscovery.jb';
        this.remoteServiceDefault = 'remote.default.jb';

        this.component = this.service.app.get('remote-microservice');
    });

    it('is exposed on the app as "remote-microservice"', function() {
        expect(this.component).to.be.instanceOf(RemoteMicroservice);
    });

    it('installs the discovery api at the configured root path with the specified method ' +
        '(default is path: "/discovery" and method: "GET")', async function() {
        const remoteService = await this.component.getService(this.remoteServiceName);
        const { body } = await remoteService.get('/discovery');

        expect(body).to.have.property('restApiRoot', '/api');
        expect(body).to.have.property('started');
        expect(body).to.have.property('version');
        expect(body).to.have.property('models');

        const models = body.models.reduce((map, definition) => {
            map[definition.name] = definition;
            return map;
        }, {});

        expect(models).to.have.property('Book');
        expect(models).to.have.property('Author')
            .that.has.property('http')
            .that.has.property('path', '/authors');
        expect(models).to.have.property('RemoteModel');
        expect(models).to.have.property('Publisher');

        expect(models).to.not.have.property('Page');
    });

    it('does not install the api if disabled or not configured', async function() {
        const {
            status,
        } = await this.service.api.get('../discovery').ok(() => true);
        expect(status).to.be.equal(404);
    });

    it('does allow access to related remote models over the api (1 level)', async function() {
        const client = await this.component.getService(this.remoteServiceDefault);
        const book = await client.models.Book.findOne();
        const test = new this.service.app.models.Test();

        // create a model having a relation to a remote model
        test.book(book);
        await test.save();

        const endpoint = `tests/${test.id}`;
        const {
            status,
            body,
        } = await this.service.api.get(endpoint).query({
            filter: {
                include: 'book',
            },
        }).ok(() => true);

        expect(status).to.be.equal(200);

        expect(body).to.be.an('object');
        expect(body).to.have.property('id', test.id);
        expect(body).to.have.property('bookId', book.id);
        expect(body).to.have.property('book').that.has.property('id', book.id);

    });

    it('does not allow includes access to related remote models for more than 1 level, ' +
        'because the relation models are not properly configured', async function() {
        const client = await this.component.getService(this.remoteServiceDefault);
        const books = await client.models.Book.find({ include: 'authors' });
        const test = new this.service.app.models.Test();
        const book = books.find(book => book.authors().length > 0);

        // create a model having a relation to a remote model
        test.book(book);
        await test.save();

        const endpoint = `tests/${test.id}`;
        const { status } = await this.service.api.get(endpoint).query({
            filter: {
                include: {
                    book: 'authors',
                },
            },
        }).ok(() => true);

        expect(status).to.be.equal(500);
    });

    it('does not allow includes access to related remote models for more than 1 level' +
        'because the data source juggler would not be able to resolve all relations');

    describe('RemoteMicroservice.getService(serviceName, establishConnection = true): ', () => {

        it('fails with a dedicated Error if the service is unavailable', async function() {
            try {
                await this.component.get(this.remoteUnavailable);
                return Promise.reject(new Error('Unavailable service should eventually fail'));
            } catch (error) {
                expect(error).to.be.instanceof(DiscoveryMaxDelayError);
            }
        });

        it('fails if a dedicated Error if service cannot be connected', async function() {
            try {
                const client = await this.component.get(this.remoteUnavailable, false);
                await client.connect();
                return Promise.reject(new Error('Unavailable service should eventually fail'));
            } catch (error) {
                expect(error).to.be.instanceof(ConnectionMaxDelayError);
            }
        });

        it('fails if the service is not configured', async function() {
            try {
                await this.component.get('nonsense');
                return Promise.reject(new Error('An unconfigured service should lead to an error'));
            } catch (error) {
                expect(error).to.be.instanceof(ServiceNotFoundError);
            }
        });

        it(
            'allows accessing failed services by setting "establishConnection" to false, i.e. to reconnect',
            async function() {
                await this.component.get(this.remoteUnavailable, false);
            },
        );

        it('triggers the discovery on services supporting it, existing models are overwritten', async function() {
            let client = await this.component.get(this.remoteWithoutAutoDiscovery, false);
            let modelNames = Object.keys(client.models);

            expect(modelNames).to.have.length(0);

            client = await this.component.get(this.remoteWithoutAutoDiscovery);
            modelNames = Object.keys(client.models);
            // the remote service is configured to not expose all models (5)
            expect(modelNames).to.have.length(4);
        });

    });

    describe('RemoteMicroservice.get(serviceName, establishConnection = true): ', () => {
        it('is an alias for RemoteMicroservice.getService', async function() {
            const service1 = await this.component.get(this.remoteServiceName);
            const service2 = await this.component.getService(this.remoteServiceName);

            expect(service1).to.equal(service2);
        });
    });

    describe('ServiceClient without discovery settings', () => {

        before('get the service client', async function() {
            this.client = await this.component.getService(this.remoteServiceWithoutDiscovery);
        });

        it('allows querying the remote-service using a simple http interface', async function() {
            const { status } = await this.client.get('/discovery');
            expect(status).to.be.equal(200);
        });

        it('allows querying the remote-service api', async function() {
            const {
                status,
                body,
            } = await this.client.api.get('authors');

            expect(status).to.be.equal(200);
            expect(body).to.be.an('array').that.has.length(4);
        });

        it('throws an error if one tries to connect to the service', async function() {
            try {
                await this.client.connect(true);
                const msg = 'Client without discovery settings should reject connection';
                return Promise.reject(new Error(msg));
            } catch (err) {
                // @todo: check the type
                expect(err).to.be.instanceof(Error);
            }
        });

        it('throws an error if one tries to discover the service', async function() {
            try {
                await this.client.discover(true);
                const msg = 'Client without discovery settings should reject discovery';
                return Promise.reject(new Error(msg));
            } catch (err) {
                expect(err).to.be.instanceof(DiscoveryNotSupportedError);
            }
        });

        it('does not expose any models', async function() {
            const modelNames = Object.keys(this.client.models);
            expect(modelNames).to.have.length(0);
        });

    });

    describe('ServiceClient with discovery settings:', () => {

        it('exposes the models configured in the "models" object', async function() {
            const service = await this.component.getService(this.remoteServiceName);
            expect(service).to.have.property('models');

            const models = service.models;

            expect(models).to.have.property('Book');
            expect(models).to.have.property('Author');
            expect(models).to.not.have.property('Publisher');
        });

        it('exposes the models on the app to make them shareable', async function() {
            await this.component.getService(this.remoteServiceName);
            expect(this.service.app.models).to.have.property('Author');
        });

        it.skip('does not expose a model on the app if isGlobal is set to false', async function() {
            await this.component.getService(this.remoteServiceName);
            expect(this.service.app.models).to.not.have.property('RemoteModel');
        });

        it('exposes models providing access to data', async function() {
            const service = await this.component.getService(this.remoteServiceName);
            const Author = service.models.Author;
            // this now accesses the currently running instance over the rest api
            const result = await Author.find({ where: { lastName: { like: 'Orw%' } } });
            expect(result).to.have.length(1);
        });

        it('exposes models providing access to data and deliver a valid id', async function() {
            const service = await this.component.getService(this.remoteServiceName);
            const Author = service.models.Author;
            const result = await Author.findOne({ where: { lastName: { like: 'Orw%' } } });

            expect(result).to.be.ok;

            expect(result).to.have.property('lastName', 'Orwell');
            expect(result).to.have.property('id').that.is.a('number');
        });

        it('exposes models allowing to perform includes', async function() {
            // todo adjust the service config to point to the currently running instance
            const service = await this.component.getService(this.remoteServiceName);
            const Author = service.models.Author;
            // this now accesses the currently running instance over the rest api
            const result = await Author.find({ where: { firstName: 'George' }, include: 'books' });

            expect(result).to.have.length(1);

            const [orwell] = result;
            const books = orwell.books();

            expect(books).to.have.length(2);
        });

        it('does only expose models which are accordingly configured over the api', async function() {
            await this.component.getService(this.remoteServiceName);
            const bookResponse = await this.service.api.get('/books').ok(() => true);
            const authorResponse = await this.service.api.get('/authors').ok(() => true);
            // books are not public
            expect(bookResponse).to.have.property('status', 404);
            // authors are public
            expect(authorResponse).to.have.property('status', 200);
        });

        it('exposes models providing query limit support', async function() {
            // todo adjust the service config to point to the currently running instance
            const service = await this.component.getService(this.remoteServiceName);
            const Author = service.models.Author;
            // this now accesses the currently running instance over the rest api
            const result = await Author.find({ limit: 2 });

            expect(result).to.have.length(2);
        });

        it(
            'exposes models providing custom remote methods and properly maps arguments to the outgoing request',
            async function() {
                const service = await this.component.getService(this.remoteServiceDefault);
                const RemoteModel = service.models.RemoteModel;

                // this argument should be sent to the remote service via header
                const languages = 'de-ch, de-it, en-gb';
                const message = 'to my service';
                const result = await RemoteModel.sayHi(message, languages, {});

                expect(result).to.be.equal(`Hi ${message} in ${languages}`);
            },
        );

        it('forwards the access token from the context if configured to do so', async function() {
            const service = await this.component.getService(this.remoteServiceDefault);
            const RemoteModel = service.models.RemoteModel;

            const id = 'testingToken';
            // normally one has to take the options from the context!
            const contextOptions = { accessToken: { id } };
            // @see: remote-model.js
            const response = await RemoteModel.checkAccessToken(contextOptions);
            expect(response).to.be.equal(id);
        });

        it('does not forward the access token from the context by default', async function() {
            const service = await this.component.getService(this.remoteServiceName);
            const RemoteModel = service.models.RemoteModel;

            const id = 'testingToken';
            // normally one has to take the options from the context!
            const contextOptions = { accessToken: { id } };
            // @see: remote-model.js
            try {
                await RemoteModel.checkAccessToken(contextOptions);
                const msg = 'The access token should not be forwarded if it is not configured to do so'
                return Promise.reject(new Error(msg));
            } catch(err) {
                expect(err.message).to.contain('AccessToken was not properly resolved');
            }
        });

    });

});
