const { expect } = require('chai');
const { describe, it } = require('mocha');

const ServiceDiscoveryApi = require('../../src/ServiceDiscoveryApi.js');

const mockApp = {
    get() {
        return 'url';
    },
};

const remoteModelDefinition = require('../support/server/remote-models/remote-model.json');

describe('The ServiceDiscoveryApi class', () => {

    describe('ServiceDiscoveryApi.formatMethodDefinitions(methods = {}):', () => {

        it('formats the passed method definitions to be suitable for a remote service', () => {
            const client = new ServiceDiscoveryApi(mockApp);
            const methodDefinitions = remoteModelDefinition.methods;
            const adjustedMethodDefinitions = client.formatMethodDefinitions(methodDefinitions);

            expect(adjustedMethodDefinitions).to.have.property('checkAccessToken');
            expect(adjustedMethodDefinitions).to.have.property('sayHi');

            const sayHiDefinition = adjustedMethodDefinitions.sayHi;
            const checkAccessTokenDefinition = adjustedMethodDefinitions.checkAccessToken;

            expect(
                checkAccessTokenDefinition,
                'the options parameter should be preserved, strong remoting will propagate the auth token',
            ).to.have.property('accepts').that.has.length(1);

            expect(
                sayHiDefinition,
                'the request parameter will be removed and the options request will be split into two parameters',
            ).to.have.property('accepts').that.has.length(3);

            const [
                nameParameter,
                acceptLanguageParameter,
                optionsParameter,
            ] = sayHiDefinition.accepts;

            expect(nameParameter).to.have.property('arg', 'name');
            expect(optionsParameter).to.have.property('arg', 'options');

            expect(acceptLanguageParameter).to.have.property('arg', 'accept-language');
            // this tells the remote service to send the second method parameter as a header
            expect(acceptLanguageParameter).to.have.property('http').that.deep.equals({
                source: 'header',
            });

        });

    });

    describe('ServiceDiscoveryApi.getModelDiscoveryDefinition(model):', () => {

        it('calls the getDiscoveryDefinition method of a model if present for intercepting', () => {
            const client = new ServiceDiscoveryApi(mockApp);
            const dummyDefinition = {
                name: 'Dummy',
                properties: {
                    example: {
                        type: 'String',
                    },
                },
            };
            const mockModel = {
                getDiscoveryDefinition() {
                    return dummyDefinition;
                },
            };

            expect(client.getModelDiscoveryDefinition(mockModel)).to.be.deep.equal(dummyDefinition);
        });

    });

});
