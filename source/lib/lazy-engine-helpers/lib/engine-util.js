
'use strict';

const url = require('url');
const request = require('request-promise-native');

/**
 * Utility class assuming that it is running in a lazy engine container.
 */
class Util
{
    /**
     * Queries lazy for engine's configuration. Uses process.env as defined by lazy to query it.
     * @return {Promise} Promise resolved with the engine configuration as returned by lazy.
     */
    static getEngineConfig(hostname = process.env.LAZY_HOSTNAME,
        engineName = process.env.LAZY_ENGINE_NAME) {

        const requestParams = {
            method: 'GET',
            url: url.format({
                protocol: 'http',
                hostname,
                pathname: '/config'
            }),
            json: true,
            headers: {
                Accept: 'application/json'
            },
            qs: {
                engine: engineName
            }
        };

        return Util._makeRequest(requestParams);
    }

    static _makeRequest(requestParams) {
        return request(requestParams);
    }
}

module.exports = Util;
