const { expect } = require('chai');
const { describe, it } = require('mocha');

const errors = require('../../src/errors.js');

describe('The error module', () => {
    it('exposes a RemoteMicroserviceError class', () => {
        const errorNames = [
            'RemoteMicroserviceError',
            'ServiceNotFoundError',
            'ConnectionError',
            'ConnectionMaxDelayError',
            'DiscoveryError',
            'DiscoveryNotSupportedError',
            'DiscoveryTimeoutError',
            'DiscoveryMaxDelayError',
        ];
        const errorTypes = Object.keys(errors);
        expect(errorTypes).to.have.same.members(errorNames);
    });
});
