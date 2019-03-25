# loopback-component-remote-microservice

Loopback component to expose and consume models of remote microservices.

## Installation

Install the package using `npm install @joinbox/loopback-component-remote-microservice` and hook it
into your application using the corresponding `component-config.json` (see configuration options).

> **Note:** In version 1.1.0 we introduced an implicitly breaking change in the configuration:
> Models that were configured in the discovery section of the services configuration by setting
> them to true where automatically interpreted by Loopback as public. They are not anymore!
> If you want the discovered models to be public (which means are they available in strong-remoting,
> _e.g._ in the api and the angular sdk) then adjust your configuration and configure your models
> according to the ServicesConfiguration section below.

## Configuration

Basically the configuration consists of a consuming part (services) and the exposing part (discovery).

```Javascript
{
    "loopback-component-remote-microservice": {
        // Configuration how the component is accessible from the app (default: "remote-microservice")
        "exposeAt": "remote-microservice",
        // Configuration to consume remote services.
        "services": {},
        // Configuration for the discovery-api that can be consumed by other services.
        // If you don't configure the discovery, it will not be mounted into the app.
        "discovery": {}
    }
}
```

For details, see below.

### DiscoveryConfiguration
```Javascript
{
        // Configuration for the discovery-api that can be consumed by other services.
        // If you don't configure the discovery, it will not be mounted into the app.
        "discovery": {
            // path to load the root discovery information from, defaults to "discovery"
            "pathname": "/discovery",
            // http verb to get the root discovery information, defaults to GET
            "method": "GET",
            // disable the api, default is false
            "disabled": false,
            // which models should be discoverable, will include all models if not set
            "models": {
                "ModelName1": true,
                "ModelName2": false,
            }
        }
    }
}
```

### Services Configuration

Every service you want to consume has to be configured in the services object. Otherwise, the
component will reject the access. If no discovery is configured, the service-client can act as an
http client to access the service and it's api.

```Javascript
{
    // config for the clients to consume other services
    "services": {
        "service.id": {
            // remote data source, has to be properly configured in your app
            "dataSource": "remote-data-source-name",
            // rootpath of your api, defaults to "/api"
            "restApiRoot": "/api",
            // describes how to discover the service, is the same as a discovery definition (see above)
            // with some configuration for the connection handling
            "discovery": {
                // if set to true, the component will start fetching models in the boot process
                "autoDiscover": true,
                // timeout for requests to the discovery endpoint in ms (default: 10000)
                "timeout": 10000,
                // initial delay for retries, will be increased with every step (default: 1000)
                "delay": 1000,
                // offset that will be multiplied with the initial delay in each retry (default: 2)
                "delayFactor": 2,
                // if the delay multiplied with the delay factor reaches maxDelay, the discovery will be aborted (default: 30000)
                "maxDelay": 30000,
                // models
                "models": {
                    // legacy format, will be transformed to { expose: true, isGlobal: true, isPublic: false }
                    "ModelName1": true,
                    // legacy format, will be transformed to { expose: false, isGlobal: false, isPublic: false }
                    "ModelName2": false,
                    "ModelName3": {
                        // the model is hooked into the app (or exposed on the api)
                        "expose": true,
                        // the model will be attached to the application and can be consumed globally (default: true)
                        "isGlobal": true
                        // the model will be reachable via api (default: false)
                        "isPublic": true,
                    }
                }
            }
        }
    }
}
```

## Usage

To consume data access the component as follows:

 ```Javascript
 // use the key of the "exposeAt" configuration property
 const remoteServices = app.get('remote-microservice');
 ```

 ### Service Client

 To access a client, use the corresponding getter of the component:

 ```Javascript
  const client = await services.get('service.id');
 ```

 To consume your service over http you can use the accessor methods of the client, returning a
 [superagent](https://github.com/visionmedia/superagent) request object:

 ```Javascript
 // without payload
 const { status, body } = await client.get('/path/relative/to/the-host');
 // or
 const { status, body } = await client.post('/path/relative/to/the-host');
 // access the api
 const { status, body } = await client.api.get('/path/relative/to/the/api-root');

 ```

 If your service has a discovery configuration, it will discover the remote service as soon as one
 accesses the client (or after booting, if `autoDiscover` is set to `true`) and expose the models
 on its model property:

 ```Javascript
 const RemoteModel = client.models.RemoteModel;
 // the methods of the persisted model are available
 const instance = await client.findOne();
 ```

### Remote Methods

If the discovered service exposes custom [remote-methods](https://loopback.io/doc/en/lb3/Remote-methods.html)
the will be available too:

```Javascript
const customMethod = await RemoteModel.doRemoteLogic(parameter1, parameter2);
```

Custom remote methods are a special case and might need additional configuration. The arguments
defined for a remote method (in the `accepts` array of the method definition) might not be suitable
for the consuming service. Especially the (very useful) `options` parameter requires further
configuration. Let's therefore make an example:

Let's assume we've got a model called `Locale` on a `language-service`. On this model we provide a
method `resolveByHeader`. Let's also assume that we've got a middleware to preprocess the
`accept-language` headers. The method definition might look as follows:

```Javascript
//remote-model.json
{
  "methods": {
     "resolveByHeader": {
        "accepts": [
            {
                "arg": "options",
                "type": "object",
                "http": "optionsFromRequest"
            }
        ],
        "returns": {
            "arg": "locales",
            "type": "Array",
            "root": true
        }
     }
  }
}
```

The method will consume the locales in its `resolveByHeader` method:

```Javascript
// locale.js
module.exports = (Locale) => {
    Locale.resolveByHeader = async function(ctx) {
        const { localesFromMiddleware } = ctx.options;
        // load the corresponding data
        return data;
    };
};
```

The remote service will not know how to provide the data which are necessary to populate the options.
Therefore we extend the definition with a `remote` section:

```Javascript
// locale.json
{
  "methods": {
     "resolveByHeader": {
        "accepts": [
            {
                "arg": "options",
                "type": "object",
                "http": "optionsFromRequest"
                "remote": {
                    "preserveOriginal": true,
                    "accepts": [
                        {
                            "arg": "accept-language",
                            "description": "This argument will be prepended to the original arg",
                            "type": "string",
                            "http": {
                                "source": "header"
                            }
                        }
                    ]
                }
            }
        ],
        "returns": {
            "arg": "locales",
            "type": "Array",
            "root": true
        }
     }
  }
}
```
The discovery api will reformat the methods definition and we can call it accordingly in the
consuming service:

```Javascript
const languageClient = await component.get('language-service');
const options = {};
const locales = await languageClient.models.Locale.resolveByHeader('de-ch', options);
```

> **Note:** The accept definition supports adding a "name" property for the argument. Sadly, the
implementation messes up `arg` and `name` and does not consistently resolve the name of the
parameter internally. Setting `name` to a value which differs from `arg` will lead to unexpected
behavior!!

#### RestAdapter (header forwarding)

Besides the aforementioned possibility to add headers as a parameter using the extended
configuration for remote methods, we introduced a custom rest adapter. It allows us to:

  1. Pass context options to events emitted by `strong-remoting`
  2. Forward headers through built-in methods of Loopback models (e.g. an accept-language header
through the built in find method)

To hook it in, one has to change the configuration format of the datasources to `js`:

```Javascript
// datasources.local.js
const { RestAdapter } = require('@joinbox/loopback-component-remote-microservice');

module.exports = {
    "your-remote-service": {
        "connector": "remote",
        "adapter": RestAdapter,
        "options" : {
            "rest": {
                "passRemoteHeaders": true,
                // remoteHeaders is the default key
                "remoteHeaderKey": "remoteHeaders",
            }
        }
    }
}

```

To send custom headers, pass them using the options object:

```Javascript
const options = {
    // remoteHeaderKey property
    remoteHeaders: {
        'accept-language': 'it-it'
    }
};
const result = await MyRemoteModel.find({}, options);
```

**Be aware:** It's up to your remote service to handle these headers. They are not automatically
processed by the remote-microservice component.

#### AccessTokens

An analogous problem are access tokens which we might have to forward. Loopback injects the
accessToken into the options parameter of the methods. Strong-remoting seems to handle this case
separately (it only consumes `accessTokens`) and we can directly forward the current context to
the remote method:

```Javascript
const languageClient = await component.get('language-service');
// options containing the current access token
const { options } = context;
const locales = await languageClient.models.Locale.resolveByHeader('de-ch', options);
```

> **Note:** Strong-remoting does not properly document how to enable access tokens via config. To
enable the passing of the access tokens add tot following to your datasource config:

```Javascript
// datasources.json
{
    "language-service": {
        "options": {
            "rest": {
                "passAccessToken": true
            }
        }
    }
}
```

We previously introduced an additional setting on the data source which was passed to the adapter.
This configuration still works but we recommend using the option given by strong-remoting.

```Javascript
// datasources.json
// @note: this is deprecated
{
    "language-service": {
        "passAccessToken": true
    }
}
```

 ### Error Handling

 The package provides a variety of Error types to handle errors. Especially the connection/discovery
 handling is important. The following error types might be important. The follwing cases might occur:

 ```Javascript
 const { errors } = require('@joinbox/loopback-component-remote-microservice');
 try {
    const client = await component.get('service.id');
    // go on
 } catch (error) {
    if(error instanceof errors.ServiceNotFoundError){
        // service is not configured
    }
    if(error instanceof errors.ConnectionMaxDelayError){
        // was not able to connect to the service (see discovery configuration)
        // currently connecting and discovering uses the same endpoint!!
    }
    if(error instanceof errors.DiscoveryNotSupportedError) {
        // discovery was not configured, only happens if the discovery was forced using
        // service.discover();
    }
    if(error instanceof errors.DiscoveryMaxDelayError) {
        // was not able to discovery the service (see discovery configuration)
        // currently connecting and discovering uses the same endpoint!!
    }
 }
 ```

 #### DiscoveryTimeouts

 If the discovery fails, e.g. reaches the `maxDelay` value, the `get` or `getService` methods will
 be rejected. The result of the discovery is cached internally. One can omit the discovery
 (and the connection process) by passing an additional boolean to the service accessors:

 ```Javascript
 try {
    const client = await component.get('service.id');
 catch(error) {
    if(error instanceof errors.DiscoveryMaxDelayError) {
        // false prevents the component from triggering the failed discovery/connection
        const client = await component.get('service.id', false);
        // true will restart the discovery process
        await client.discover(true);
    }
 }
 ```

 Using these mechanics will allow you to keep the discovery running in your application as long as
 you want to.

## How it works

### The Discovery

Per default (if configured and enabled), the remote service exposes a discovery entry point. It will
return a definition of the service (containing its restApiRoot, the date it was started, the version
and definitions for the models which are exposed).

### The ServiceClient

The remote-microservice component will trigger the discover as soon as a client is accessed (or
after booting if autoDiscover is set to true). As soon as the client has discovered the service
it will generate models on the data source it is attached to and exposes them on its `models`
property.

## Restrictions and Caveats

### Relations, Api and Includes

We include relations in the discovery. This allows us to use the common methods on the remote-models
for accessing relations. Sadly the data-source-juggler is neither able to handle hasAndBelongs to
many relations (because the relation models are not properly initialized) nor will it be able
to detect relations that are not locally defined. While the remote-connector correctly delegates
includes to the remote-service, the data-source-juggler will fail to resolve relations of models
which are not defined locally. Therefore includes via api will only work partially.


### Model Registry

Loopback has a giant pile of shared state namely its model registry. As soon as we define the models
on the data source, they will be available for the whole application. Be aware, that existing models
will be overwritten after the discovery. We could probably prefix the model names, but this would
require us to rewrite their relations.
