/**
 * This is currently just a container, we might need to extend it!
 */
module.exports = class ServiceClient {

    get models() {
        return this.dataSource.models;
    }

    constructor(dataSource) {
        this.dataSource = dataSource;
    }
};
