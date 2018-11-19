module.exports = function(RemoteModel) {
    /**
     * This is an example how the http properties are added to the context, consumed by
     * the sayHi method.
     */
    RemoteModel.beforeRemote('sayHi', async (ctx) => {
        const acceptLanguage = ctx.req.headers['accept-language'];
        ctx.args.options.languages = acceptLanguage;
    });
    /**
     * Method to check if remote methods are available in the consuming service and if the
     * parameters which are configured are properly forwarded. In this case, the accept-language
     * header should be sent.
     *
     * Also we test if the req parameter is properly removed from the definition in the consuming
     * service
     *
     * @param name
     * @param languages
     * @param ctx
     * @return {Promise<string>}
     */
    RemoteModel.sayHi = async function(name, options, req) {
        const languages = options.languages;
        return `Hi ${name} in ${languages}`;
    };

    /**
     * Method to check if the access token was forwarded to the current context.
     *
     * @param ctx
     * @return {Promise<{String}>}
     */
    RemoteModel.checkAccessToken = async function(ctx) {
        const { accessToken } = ctx;
        // the context will not have an access token in this case, because we did not create one
        if(accessToken && accessToken.id === 'testingToken') {
            return accessToken.id;
        }
        const error = new Error('AccessToken was not properly resolved');
        error.status = 400;
        throw error;
    };
};
