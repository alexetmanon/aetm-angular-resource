(function () {
    'use strict';

    angular
        .module('aetm-resource', [
            'ngResource',
            'angular-cache'
        ])
        .factory('aetmResource', [
            '$resource',
            'CacheFactory',
            function ($resource, CacheFactory) {
                var resource,
                    cacheResourceId,
                    cacheResource,
                    actionDefaults;

                cacheResourceId = 'aetm-resource-cache-' + Math.random().toString(36).slice(2);

                // create cache with a random ID
                cacheResource = CacheFactory.createCache(cacheResourceId, {
                    storageMode: 'localStorage'
                });

                // Defines default actions to override default $resource ones
                actionDefaults = {
                    query: {
                        method: 'GET',
                        isArray: true,
                        cache: cacheResource
                    },
                    get: {
                        method: 'GET',
                        cache: cacheResource
                    },
                    create: {
                        method: 'POST'
                    },
                    update: {
                        method: 'PUT'
                    }
                };

                /**
                 * @param  String url
                 * @param  Object paramDefaults
                 * @param  Object actions
                 * @param  Object options
                 * @return $resource
                 */
                return function (url, paramDefaults, actions, options) {

                    // use standard $resource with override actions
                    resource = $resource(
                        url,
                        paramDefaults,
                        angular.merge({}, actionDefaults, actions),
                        options
                    );

                    /**
                     * Removes all cached requests.
                     */
                    resource.invalidateCache = function () {
                        cacheResource.removeAll();
                    };

                    /**
                     * @return Cache
                     */
                    resource.getCache = function () {
                        return cacheResource;
                    };

                    return resource;
                };
            }
        ]);
}());