const { MicroserviceError } = require('@joinbox/loopback-microservice');

class RemoteMicroserviceError extends MicroserviceError {}

/**
 * Error thrown if the RemoteMicroservice component does not have an according service configured.
 */
class ServiceNotFoundError extends RemoteMicroserviceError {}

/**
 * Error thrown if the remote service cannot be connected
 */
class ConnectionError extends RemoteMicroserviceError {}

/**
 * Error thrown if the max delay of establishing a connection was reached
 */
class ConnectionMaxDelayError extends RemoteMicroserviceError {}
/**
 * General error created during discovery.
 */
class DiscoveryError extends RemoteMicroserviceError {}

/**
 * Error thrown if a service client does not support discovery.
 */
class DiscoveryNotSupportedError extends DiscoveryError {}

/**
 * Error thrown if the discovery times out.
 */
class DiscoveryTimeoutError extends DiscoveryError {}

/**
 * Error thrown if the discovery process reaches the maximal backoff delay.
 */
class DiscoveryMaxDelayError extends DiscoveryError {}

module.exports = {
    RemoteMicroserviceError,
    ServiceNotFoundError,
    ConnectionError,
    ConnectionMaxDelayError,
    DiscoveryError,
    DiscoveryNotSupportedError,
    DiscoveryTimeoutError,
    DiscoveryMaxDelayError,
};
