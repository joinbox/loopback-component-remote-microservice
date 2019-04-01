module.exports = async function(app) {
    app.enableAuth();
    if (app.models.AccessToken) {
        await app.models.AccessToken.create({
            id: 'testingToken',
        });
    }
    if (app.models.RemoteModel) {
        await app.models.RemoteModel.create([{
            locale: 'de-ch',
        },
        {
            locale: 'it-it',
        }]);
    }
};
