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
                 * Check `cache` attribute of actions objects and active local cache if === true.
                 *
                 * @param  Object actions
                 * @return Object
                 */
                function prepareActions(actions) {
                    for (var action in actions) {
                        if (actions.hasOwnProperty(action)) {

                            if(actions[action].cache === true) {
                                actions[action].cache = cacheResource;
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
                    cacheResourceId = 'aetm-resource-cache-' + options.cacheId ? options.cacheId : 'default';

                    // create cache with a random ID
                    cacheResource = CacheFactory.createCache(cacheResourceId, {
                        storageMode: 'localStorage'
                    });

                    // use standard $resource with override actions
                    resource = $resource(
                        url,
                        paramDefaults,
                        prepareActions(actions),
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