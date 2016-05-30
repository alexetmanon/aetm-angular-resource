(function () {
    'use strict';

    angular
        .module('aetm-resource', [
            'ngResource',
            'angular-cache'
        ])
        .factory('aetmResource', [
            '$resource',
            '$q',
            'CacheFactory',
            function ($resource, $q, CacheFactory) {
                var resource,
                    resourceBaseUrl,
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
                 * Transforms stored query response into an array of values.
                 *
                 * @return Array
                 */
                function prepareDataFromCache() {
                    var rawCachedQuery = cacheResource.get(resourceBaseUrl);

                    if (rawCachedQuery && rawCachedQuery.$$state.status === 1) {
                        return angular.fromJson(rawCachedQuery.$$state.value.data);
                    }

                    return [];
                }

                /**
                 * Custom `get` function to avoid new request if the data are already there. eg. After a query request to see the detail of an element.
                 * This function first looks in the query cache to return a `$resource` like object or perform a request through the classic get() function of `$resource` if needed.
                 *
                 * @param  Object params
                 * @param  Function success
                 * @param  Function error
                 * @return Promise
                 */
                function getFromQuery(params, success, error) {
                    var getData = {},
                        cachedQuery = prepareDataFromCache(),
                        i,
                        len = cachedQuery.length;

                    // search for the given ID
                    for (i = 0; i < len; i += 1) {
                        if (cachedQuery[i].id === params.id) {
                            success(cachedQuery[i]);

                            return angular.extend(cachedQuery[i], {
                                '$promise': $q.resolve(cachedQuery[i]),
                                '$resolved': true
                            });
                        }
                    }

                    return resource.get(params, success, error);
                }

                /**
                 * @param  String url
                 * @param  Object paramDefaults
                 * @param  Object actions
                 * @param  Object options
                 * @return $resource
                 */
                return function (url, paramDefaults, actions, options) {
                    // basicaly removes all `:param`
                    resourceBaseUrl = url.replace(/(\/\:\w*)/g, '');

                    // use standard $resource with override actions
                    resource = $resource(
                        url,
                        paramDefaults,
                        angular.merge({}, actionDefaults, actions),
                        options
                    );

                    /**
                     *
                     */
                    resource.getFromQuery = getFromQuery;

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