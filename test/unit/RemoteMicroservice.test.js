const { expect } = require('chai');
const { describe, it } = require('mocha');

const pkg = require('../../index.js');

describe('The RemoteMicroservice package', () => {
    it('exposes a custom rest adapter', () => {
        expect(pkg).to.have.a.property('RestAdapter').that.is.a('function');
    });
});
