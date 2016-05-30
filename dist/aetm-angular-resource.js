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
                /**
                 * Adds default actions to given by user and active cache if needed.
                 *
                 * @param  Object actions
                 * @return Object
                 */
                function prepareActions(actions, cacheResource) {
                    var action,
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

                    for (action in actions) {
                        if (actions.hasOwnProperty(action)) {

                            if (actions[action].cache === true) {
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
                    var resource,
                        cacheResourceId,
                        cacheResource,
                        actionDefaults;

                    // Compute cache resource ID from 'cacheId' option
                    cacheResourceId = 'aetm-resource-cache-' + (options && options.cacheId) ? options.cacheId : 'default';

                    // init cache
                    cacheResource = CacheFactory.get(cacheResourceId);
                    if (!cacheResource) {
                        cacheResource = CacheFactory.createCache(cacheResourceId, {
                            storageMode: 'localStorage'
                        });
                    }

                    // init standard $resource with override actions
                    resource = $resource(
                        url,
                        paramDefaults,
                        prepareActions(actions,  cacheResource),
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