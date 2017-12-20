const { expect } = require('chai');

const ServiceClient = require('../../src/ServiceClient');

describe('The ServiceClient class', () => {

    before('setup dummy data source', function() {
        this.dataSource = {
            models: {},
        };
    });

    it('takes a data source as argument', function() {
        const client = new ServiceClient(this.dataSource);
        expect(client).to.have.property('dataSource', this.dataSource);
    });

    it('exposes the models of the data source', function() {
        const client = new ServiceClient(this.dataSource);
        expect(client.models).to.be.equal(this.dataSource.models);
    });

});
