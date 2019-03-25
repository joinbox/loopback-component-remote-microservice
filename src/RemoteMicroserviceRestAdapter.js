const RestAdapter = require('strong-remoting/lib/rest-adapter.js');
const HttpInvocation = require('strong-remoting/lib/http-invocation.js');

module.exports = class CustomAdapter extends RestAdapter {

    _getArguments(restArguments) {
        // if there are two arrays, the first is ctorArgs and the second is args
        // if there is only one array, it is set to be args and the ctorArgs are set to an
        // empty array
        // the last argument is always the callback
        const [callback] = restArguments.slice(-1);
        const [constructorArgs, argArray] = restArguments;
        const constructorArgArray = Array.isArray(constructorArgs) ? constructorArgs : [];
        if (!Array.isArray(argArray)) {
            return {
                args: constructorArgArray,
                ctorArgs: [],
                callback,
            };
        }
        return {
            args: argArray,
            ctorArgs: constructorArgArray,
            callback,
        };
    }

    /**
     * @override
     * @param method
     * @param ctorArgs
     * @param args
     * @param callback
     * @return {*}
     */
    async invoke(method, ...restArgs) {
        const { args, ctorArgs, callback } = this._getArguments(restArgs);

        const restMethod = this.getRestMethodByName(method);
        if (!restMethod) {
            return callback(new Error(`Cannot invoke unkown method: ${method}`));
        }
        const invokeOptions = restMethod.getArgByName('options', args);
        const auth = this._getInvocationAuth(invokeOptions);

        const invocation = new HttpInvocation(
            restMethod,
            ctorArgs,
            args,
            this.connection,
            auth,
            this.typeRegistry,
        );
        const ctx = invocation.context;
        ctx.req = invocation.createRequest();
        // propagate the options to the internal hooks
        ctx.options = invokeOptions;

        const scope = ctx.getScope();
        // @note: we have to prevent the callback from receiving it's own errors
        this._invoke(invocation, restMethod, scope, ctx)
            .then(results => callback.call(invocation, null, ...results), callback);
    }

    async _invoke(invocation, restMethod, scope, ctx) {
        this.propagateRemoteHeaders(ctx);
        await this._executeRemoteMethodHooks('before', restMethod, scope, ctx);
        const results = await this._executeInvocation(invocation, ctx);
        await this._executeRemoteMethodHooks('after', restMethod, scope, ctx);
        return results;
    }

    async _executeInvocation(invocation, ctx) {
        return new Promise((resolve, reject) => {
            invocation.invoke((invocationError, ...results) => {
                if (invocationError) {
                    return reject(invocationError);
                }
                const [result] = results;
                // eslint-disable-next-line no-param-reassign
                ctx.result = result;
                // eslint-disable-next-line no-param-reassign
                ctx.res = invocation.getResponse();
                return resolve(results);
            });
        });
    }

    async _executeRemoteMethodHooks(subPhase, restMethod, scope, ctx) {
        return new Promise((resolve, reject) => {
            this.remotes.execHooks(subPhase, restMethod, scope, ctx, (hookError) => {
                if (hookError) {
                    return reject(hookError);
                }
                return resolve();
            });
        });
    }

    propagateRemoteHeaders(ctx) {
        const {
            passRemoteHeaders = false,
            remoteHeaderKey = 'remoteHeaders',
        } = this.options;
        if (passRemoteHeaders === true) {
            if (ctx.options && ctx.options[remoteHeaderKey]) {
                ctx.req.headers = Object.assign(
                    {},
                    ctx.req.headers,
                    ctx.options[remoteHeaderKey],
                );
            }
        }
    }
};
