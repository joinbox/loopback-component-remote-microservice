const {expect} = require('chai');

const error = require('../../src/error');

describe('The error module', function(){
    it('exposes a RemoteMicroserviceError class', function(){
        expect(error)
            .to.have.property('RemoteMicroserviceError');
    });
});