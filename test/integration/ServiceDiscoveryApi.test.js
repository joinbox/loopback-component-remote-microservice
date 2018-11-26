const { expect } = require('chai');
const { before, describe, it } = require('mocha');

const ServiceDiscoveryApi = require('../../src/ServiceDiscoveryApi');

describe('The ServiceDiscoveryApi ', () => {

    before('setup discovery', function() {
        this.restApiRoot = '/api';
        this.settings = {
            restApiRoot: this.restApiRoot,
            version: '1.0.1',
        };
        this.discoveryApi = new ServiceDiscoveryApi(this.service.app, this.settings);
    });

    it(
        '#restApiRoot: returns the configured rest api root or the rest api root of the app',
        function() {
            expect(this.discoveryApi.restApiRoot).to.be.equal(this.restApiRoot);
        },
    );

    describe('ServiceDiscoveryApi.getModelDefinitions(app):', () => {

        /**
         * This test is influenced by side-effects of the discovery (fuck you and your global state
         * Loopback).
         */
        it.skip('returns the configured models and their definitions', function() {
            const definitions = this.discoveryApi.getModelDefinitions(this.service.app);
            // the test model
            expect(definitions).to.be.an('array');
            expect(definitions).to.have.length(1);
        });

    });

    describe('ServiceDiscoveryApi.getModelDiscoveryDefinition(model):', () => {
        it('returns the model definition', function() {
            const testDefinition = this.discoveryApi
                .getModelDiscoveryDefinition(this.service.app.models.Test);

            expect(testDefinition).to.have.property('name', 'Test');
            expect(testDefinition).to.have.property('http').that.has.property('path', '/tests');
            expect(testDefinition).to.have.property('properties');
            expect(testDefinition).to.have.property('methods');
            expect(testDefinition).to.have.property('relations');
        });
    });

    describe('ServiceDiscoveryApi.getServiceDiscoveryDefinition()', () => {
        it('returns the definition of the service and its models', function() {
            const definition = this.discoveryApi.getServiceDiscoveryDefinition();
            // the test model
            expect(definition).to.be.an('object');

            expect(definition).to.have.property('models').that.is.an('array');
            expect(definition).to.have.property('restApiRoot', '/api');
            expect(definition).to.have.property('started');
            expect(definition).to.have.property('version', '1.0.1');
        });
    });
});
