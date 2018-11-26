module.exports = {
    mount(app, serviceDiscoveryApi, { pathname = '/', method = 'GET' } = {}) {

        const accessor = method.toLowerCase();
        // create a router/sub-app to use
        const router   = new app.loopback.Router();
        // install the request handler of the discovery at the specified path
        router[accessor].call(router, pathname, (req, res, next) => {
            try {
                const response = serviceDiscoveryApi.getServiceDiscoveryDefinition();
                res.status(200).json(response);
            } catch (error) {
                next(error);
            }
        });
        // mount it into the app
        app.use(router);

        return serviceDiscoveryApi;
    },
};