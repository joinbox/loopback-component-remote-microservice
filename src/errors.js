const { MicroserviceError } = require('@joinbox/loopback-microservice');

class RemoteMicroserviceError extends MicroserviceError {}

/**
 * Error thrown if the RemoteMicroservice component does not have an according service configured.
 */
class ServiceNotFoundError extends RemoteMicroserviceError {}

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
    DiscoveryError,
    DiscoveryNotSupportedError,
    DiscoveryTimeoutError,
    DiscoveryMaxDelayError
};
