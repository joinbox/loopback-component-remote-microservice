const { expect } = require('chai');
const { before, describe, it } = require('mocha');

const ComponentConfig = require('../../src/ComponentConfig.js');
const { RemoteMicroserviceError } = require('../../src/errors.js');


function mergeDiscovery(values = {}) {
    return Object.assign({
        autoDiscover: true,
        delay: 1000,
        delayFactor: 2,
        disabled: false,
        maxDelay: 40000,
        method: 'get',
        models: undefined,
        pathname: '/discovery',
        timeout: 10000,
    }, values);
}

describe('The ComponentConfig class', function() {

    before('instantiate a configuration', function() {
        this.app = {
            dataSources: {
                testDataSource: {
                    connector: {
                        name: 'remote-connector',
                        url: 'http://service.jb/api',
                    },
                },
            },
        };
    });

    it('can be instantiated with an app and a plain configuration', () => {
        const config = new ComponentConfig(this.app, {});
        expect(config).to.be.instanceof(ComponentConfig);
    });

    describe('ComponentConfig.validate():', () => {
        it('currently calls normalize, so see according tests');
    });

    describe('ComponentConfig.normalize():', () => {
        it('accepts an empty configuration and adds the default "exposeAt" property' +
            'an empty services object and a disabled discovery', () => {
            const config = new ComponentConfig(this.app, {});
            const normalized = config.normalize();

            expect(normalized).to.have.property('exposeAt', 'remote-microservice');
            expect(normalized).to.have.property('services').that.deep.equals({});
            expect(normalized).to.have.property('discovery').that.deep.equals({
                disabled: true,
            });
        });

        it(
            'accepts a config containing a service object which at least needs a valid "dataSource"' +
            'which is assigned to the "remote-connector"',
            function() {
                const plainConfig = {
                    services: {
                        testService: {
                            dataSource: 'testDataSource',
                        },
                    },
                };
                const config = new ComponentConfig(this.app, plainConfig);
                const { services } = config.normalize();

                expect(services).to.have.property('testService');

                const { testService } = services;
                expect(testService).to.deep.equal({
                    dataSource: 'testDataSource',
                    // the service is not discoverable
                    discovery: {
                        disabled: true,
                    },
                    name: 'testService',
                    // the restApiRoot defaults to '/api'
                    restApiRoot: '/api',
                    // the config strips of the apiRoot from the url of the dataSource
                    url: 'http://service.jb/',
                });
            },
        );

        it('throws an error if the data source is not available', () => {
            const plainConfig = {
                services: {
                    testService: {
                        dataSource: 'testDataSource',
                    },
                },
            };
            const mockApp = {
                dataSources: {},
            };
            const config = new ComponentConfig(mockApp, plainConfig);
            expect(() => {
                config.normalize();
            }).to.throw(RemoteMicroserviceError);
        });

        it('throws an error if the dataSource is not attached to a remote-connector', () => {
            const plainConfig = {
                services: {
                    testService: {
                        dataSource: 'testDataSource',
                    },
                },
            };
            const mockApp = {
                dataSources: {
                    testDataSource: {
                        connector: {
                            name: 'test',
                        },
                    },
                },
            };
            const config = new ComponentConfig(mockApp, plainConfig);
            expect(() => {
                config.normalize();
            }).to.throw(RemoteMicroserviceError);
        });

        it('normalizes the discovery settings of a service if they are present', function() {
            const plainConfig = {
                services: {
                    testService: {
                        dataSource: 'testDataSource',
                        discovery: {},
                    },
                },
            };
            const config = new ComponentConfig(this.app, plainConfig);
            const { services } = config.normalize();
            const { discovery } = services.testService;

            expect(discovery).to.be.deep.equal(mergeDiscovery());
        });
    });

    describe('ComponentConfig.normalizeConfiguration(app, config):', () => {

        it('instantiates a ComponentConfig and calls the normalize method', function() {
            const dataSource = 'testDataSource';
            const exposeAt = 'some-property';
            const maxDelay = 3000;
            const models = {
                ConfigFalse: false,
                ConfigTrue: true,
                ConfigPublic: {
                    expose: true,
                    isPublic: true,
                },
                ConfigEmpty: {},
                ConfigNegated: {
                    expose: false,
                    isPublic: true,
                    isGlobal: false,
                },
            };
            const url = 'http://service.jb/';
            const restApiRoot = '/api';
            const conf = {
                services: {
                    test1: {
                        dataSource,
                        discovery: {
                            maxDelay,
                            models,
                        },
                        restApiRoot,
                        models,
                    },
                    test2: {
                        dataSource,
                    },
                },
                discovery: {
                    method: 'options',
                },
                exposeAt,
            };
            const normalized = ComponentConfig.normalizeConfiguration(this.app, conf);
            expect(normalized).to.deep.equal({
                discovery: mergeDiscovery({ method: 'options' }),
                exposeAt,
                services: {
                    test1: {
                        dataSource,
                        discovery: mergeDiscovery({
                            maxDelay,
                            models: {
                                ConfigFalse: {
                                    expose: false,
                                    isPublic: false,
                                    isGlobal: false,
                                },
                                ConfigTrue: {
                                    expose: true,
                                    isPublic: false,
                                    isGlobal: true,
                                },
                                ConfigPublic: {
                                    expose: true,
                                    isPublic: true,
                                    isGlobal: true,
                                },
                                ConfigEmpty: {
                                    expose: true,
                                    isPublic: false,
                                    isGlobal: true,
                                },
                                ConfigNegated: {
                                    expose: false,
                                    isPublic: true,
                                    isGlobal: false,
                                },
                            },
                        }),
                        name: 'test1',
                        restApiRoot,
                        url,
                    },
                    test2: {
                        dataSource,
                        discovery: {
                            disabled: true,
                        },
                        name: 'test2',
                        restApiRoot,
                        url,
                    },
                },
            });
        });
    });

});
