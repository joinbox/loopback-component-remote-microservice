const { expect } = require('chai');
const { before, describe, it } = require('mocha');

describe('The CustomRestAdapter', () => {

    before('get the component', function() {
        this.remoteServiceName = 'remote.jb';
        this.remoteServiceWithoutDiscovery = 'remote.without-connection.jb';
        this.remoteUnavailable = 'remote.unavailable.jb';
        this.remoteWithoutAutoDiscovery = 'remote.without-autodiscovery.jb';
        this.remoteServiceDefault = 'remote.default.jb';

        this.component = this.service.app.get('remote-microservice');
    });

    it('forwards the access token from the context if configured to do so', async function() {
        const service = await this.component.getService(this.remoteServiceDefault);
        const { RemoteModel } = service.models;

        const id = 'testingToken';
        // normally one has to take the options from the context!
        const contextOptions = { accessToken: { id } };
        // @see: remote-model.js
        const response = await RemoteModel.checkAccessToken(contextOptions);
        expect(response).to.be.equal(id);
    });

    it('does not forward the access token from the context by default', async function() {
        const service = await this.component.getService(this.remoteServiceName);
        const { RemoteModel } = service.models;

        const id = 'testingToken';
        // normally one has to take the options from the context!
        const contextOptions = { accessToken: { id } };
        // @see: remote-model.js
        try {
            await RemoteModel.checkAccessToken(contextOptions);
            const msg = 'The access token should not be forwarded if it is not configured to do so';
            return Promise.reject(new Error(msg));
        } catch (err) {
            expect(err.message).to.contain('AccessToken was not properly resolved');
            return Promise.resolve();
        }
    });

    it('forwards options into the hooks of the connector', async function() {
        const service = await this.component.getService(this.remoteServiceDefault);
        const { RemoteModel } = service.models;
        const options = { yay: true, accessToken: { id: 'hallooo' } };
        const context = {};
        RemoteModel.dataSource.connector.remotes.once('before.*.*', (ctx, next) => {
            context.options = ctx.options;
            next();
        });
        const result = await RemoteModel.find({}, options);
        expect(context).to.have.property('options', options);
        expect(result).to.have.length(2);
    });

    it('forwards headers set on the options object - if configured accordingly (headers passed' +
        ' via parameters are overridden) - for custom remote method calls', async function() {
        const service = await this.component.getService(this.remoteServiceDefault);
        const { RemoteModel } = service.models;
        const testRemoteHeaders = { 'accept-language': 'it-it, *' };
        const options = { testRemoteHeaders };

        const result = await RemoteModel.sayHi('Tester', 'de-ch', options);

        expect(result).to.be.equal('Hi Tester in it-it, *');
    });

    it('forwards headers set on the options object - if configured accordingly (headers passed' +
        ' via parameters are overridden) - for default remote method calls', async function() {
        const service = await this.component.getService(this.remoteServiceDefault);
        const { RemoteModel } = service.models;
        const testRemoteHeaders = { 'accept-language': 'it-it' };
        const options = { testRemoteHeaders };

        const result = await RemoteModel.find({}, options);
        expect(result).to.have.length(1);
        expect(result[0]).to.have.property('locale', 'it-it');
    });
});
