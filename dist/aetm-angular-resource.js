(function () {
    'use strict';

    angular
        .module('aetm-resource', [
            'ngResource',
            'angular-cache',
            'aetm-network'
        ])
        .factory('aetmHttpBuffer', [
            '$http',
            function ($http) {
                return function () {
                    var buffer = [];

                    function retryHttpRequest(config, deferred) {
                        return $http(config).then(
                            deferred.resolve,
                            deferred.reject
                        );
                    }

                    return {
                        append: function (config, deferred) {
                            buffer.push({
                                config: config,
                                deferred: deferred
                            });
                        },

                        retryAll: function () {
                            var i,
                                len = buffer.length;

                            for (i = 0; i < len; i += 1) {
                                retryHttpRequest(buffer[i].config, buffer[i].deferred);
                            }

                            buffer = [];
                        }
                    };
                };
            }
        ])
        .factory('aetmResource', [
            '$resource',
            'CacheFactory',
            'aetmHttpBuffer',
            'aetmNetworkService',
            '$rootScope',
            '$q',
            function ($resource, CacheFactory, aetmHttpBuffer, aetmNetworkService, $rootScope, $q) {

                /**
                 * This interceptor store the request into a buffer is the application is currently offline.
                 *
                 * @param  Object
                 * @return Promise
                 */
                function errorInterceptor(rejection, buffer) {
                    if (aetmNetworkService.isOffline()) {
                        var deferred = $q.defer();

                        // HACK: http://www.bennadel.com/blog/2800-forcing-q-notify-to-execute-with-a-no-op-in-angularjs.htm
                        deferred.promise.then(null, null, angular.noop);

                        deferred.notify({
                            status: 'offline'
                        });

                        // add request to the stack
                        buffer.append(rejection.config, deferred);

                        return deferred.promise;
                    }

                    return $q.reject(rejection);
                }

                /**
                 * Adds default actions to given by user and active cache if needed.
                 *
                 * @param  Object actions
                 * @return Object
                 */
                function prepareActions(actions, resourceCache, requestsBuffer) {
                    var action,
                        actionDefaults,
                        cacheInterceptor;

                    // Interceptor to handle caching on POST, PUT, DELETE
                    cacheInterceptor = {
                        responseError: function (rejection) {
                            return errorInterceptor(rejection, requestsBuffer);
                        }
                    };

                    // Customize defaults actions (and adds two new)
                    actionDefaults = {
                        get: {
                            method: 'GET',
                            cache: resourceCache
                        },
                        query: {
                            method: 'GET',
                            isArray: true,
                            cache: resourceCache
                        },
                        save: {
                            method: 'POST',
                            interceptor: cacheInterceptor
                        },
                        remove: {
                            method: 'DELETE',
                            interceptor: cacheInterceptor
                        },
                        delete: {
                            method: 'DELETE',
                            interceptor: cacheInterceptor
                        },

                        // Custom methods for more convenience
                        create: {
                            method: 'POST',
                            interceptor: cacheInterceptor
                        },
                        update: {
                            method: 'PUT',
                            interceptor: cacheInterceptor
                        }
                    };

                    // Active cache if needed
                    for (action in actions) {
                        if (actions.hasOwnProperty(action)) {
                            if (actions[action].cache === true) {
                                actions[action].cache = resourceCache;
                            }
                        }
                    }

                    return angular.merge({}, actionDefaults, actions);
                }

                /**
                 * @param  String url
                 * @param  Object paramDefaults
                 * @param  Object actions
                 * @param  Object options
                 * @return $resource
                 */
                return function (url, paramDefaults, actions, options) {
                    var resource,
                        resourceCacheId,
                        resourceCache,
                        actionDefaults,
                        requestsBuffer;

                    // Compute cache resource ID from 'cacheId' option
                    resourceCacheId = 'aetm-resource-cache-' + (options && options.cacheId) ? options.cacheId : 'default';

                    // init cache
                    resourceCache = CacheFactory.get(resourceCacheId);
                    if (!resourceCache) {
                        resourceCache = CacheFactory.createCache(resourceCacheId, {
                            storageMode: 'localStorage'
                        });
                    }

                    // init request buffer
                    requestsBuffer = aetmHttpBuffer();

                    // Retry all buffered requests when network is back
                    $rootScope.$on('aetm-network:online', function () {
                        requestsBuffer.retryAll();
                    });

                    // init standard $resource with override actions
                    resource = $resource(
                        url,
                        paramDefaults,
                        prepareActions(actions,  resourceCache, requestsBuffer),
                        options
                    );

                    /**
                     * Removes all cached requests.
                     */
                    resource.invalidateCache = function () {
                        resourceCache.removeAll();
                    };

                    /**
                     * @return Cache
                     */
                    resource.getCache = function () {
                        return resourceCache;
                    };

                    return resource;
                };
            }
        ]);
}());