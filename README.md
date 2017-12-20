# loopback-component-remote-microservice

Loopback component to expose and consume models of remote microservices.

## Installation

Install the package using `npm` (currently only from github) and hook it into your application using
the corresponding `component-config.json` (see configuration options).

## Configuration

```Javascript
{
    "loopback-component-remote-microservice": {
        // config for the clients to consume other services
        "services": {
            // usually the hostname in your network, this will be used to access the service
            "service.id": {
                // defaults to the service.id 
                "hostname": "0.0.0.0",
                // defaults to 80 (or no port)
                "port": 3000,
                // defaults to the root path (empty)
                "pathname": "/discovery",
                // defaults to OPTIONS
                "method": "GET",
                // debug option which is passed to the rest-datasource
                "debug": true
            }
        },
        // config for the api that can be discovered by other services
        // if you don't configure the api, it will not be mounted into the app
        "api": {
            // path to load the root discovery information
            "pathname": "/discovery",
            // http verb to get the root discovery information, defaults to OPTIONS
            "method": "GET",
            // this is a development setting, defaults to true (you cannot hook in the api into
            // the app before the models are decorated)
            "ensureInstallation": true,
            // disable the api, default is false
            "disabled": false,
            // which resources should be discoverable, defaults to an empty array which means
            // all resources
            "resources": []
        } 
    }
}
```

Every service you want to consume has to be configured in the services object. Otherwise, the
component will reject the access.

## Consume Service

To consume a remote service, access the component and use the provided rest models:
 
 ```Javascript
 const services = app.get('remote-microservice');
 // loads the definitions at run time, creates a rest datasource and attaches the remotely 
 // discovered models (this is asynchronous)
 const service = await services.get('service.id');
 // consume data
 service.models.Book.find({where:{title: '1984'}});
 ```
 
 ### Note
 
   - The models exposed by the client are rest-models. Their api is slightly different from the persisted model.
   - Up to now we do not have any sort of error handling if the remote service is not available
   - We cache the service definition in-memory without a ttl, so to update the definitions you'd 
   have to restart the service 

## How it works

### The Api (Server)

Per default (if configured and enabled), the mainly exposes two entry points: the root discovery url
and an endpoint per resource. The root discovery url per default can be reached via `OPTIONS` request
to your service returning the path to the api (relative to the root) and a collection of resources,
containing the resource name (i.e. the model name) and its path (relative to the api root):

```JSON
{
    "restApiRoot": "/api",
    "resources": [
        {
            "name": "Book",
            "path": "/books"
        },
        {
            "name": "Author",
            "path": "/authors"
        }
    ]
}
```
All paths are relative, so the service does not need to know how it is reachable from the requesting
service.

Further, the api decorates all the resource enpoints with a remote method listening to an `OPTIONS`
request to the models base endpoint. The method is called `getDiscoveryDefinition` and is created on your
models. You can create your own if you whish to expose more or less data on a per model base. This
endpoint basically returns the definition of the model itself, similar to the corresponding json file.

### The Discovery (Client)

On access, the client performs the following steps:

  1. lookup the root discovery url of the remote service e.g. `http://user.jb/discovery` to gather the information where the api lies and which models are available
  2. resolve the url of each resource and load the corresponding model definition
  3. create a data source using the rest-connector in the current application (named after the service id)
  4. attach models to the data source specified by the definitions previously loaded from the remote service 

While the paths in the api part are delivered whithout host informations, the client will resolve all
paths and configure the client/datasource accordingly.