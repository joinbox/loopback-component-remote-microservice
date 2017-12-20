module.exports = {
    mount(app, component, { pathname = '/', method = 'OPTIONS' } = {}) {

        const accessor = method.toLowerCase();
        // create a router/sub-app to use
        const router   = new app.loopback.Router();
        // instantiate the discovery
        component.install();
        // install the request handler of the discovery at the specified path
        router[accessor].call(router, pathname, component.getRequestHandler());
        // mount it into the app
        app.use(router);

        return component;
    }
};