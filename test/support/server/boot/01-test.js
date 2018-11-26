module.exports = async function(app) {
    app.enableAuth();
    if(app.models.AccessToken) {
        await app.models.AccessToken.create({
            id: 'testingToken',
        });
    }
    // log queries
    /*app.use((req, res, next) => {
        const serviceName = app.get('microservice').name;
        console.log(`${serviceName}: ${req.path}`);
        next();
    });*/
};
