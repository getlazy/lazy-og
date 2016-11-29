
'use strict';

const LazyClient = require('../lazy-client');
const request = require('request');
const os = require('os');
const errors = require('common-errors');

const VERSION = 'v20161128';

/**
 * Client for lazy API v20161128.
 */
class LazyClientv20161128 extends LazyClient
{
    static get version() {
        return VERSION;
    }

    constructor(serviceUrl, client, stackId, host) {
        super();
        this._serviceUrl = serviceUrl;
        this._client = client;
        this._host = host || os.hostname();
        this._stackId = stackId;
    }

    analyzeFile(content, path, grammar) {
        const self = this;

        const requestParams = {
            method: 'POST',
            url: self._serviceUrl + '/file',
            json: true,
            headers: {
                'Accept': 'application/json',
                'X-LazyClient-Version': VERSION
            },
            body: {
                stackId: self._stackId,
                client: self._client,
                host: self._host,
                content: content,
                path: path,
                grammar: grammar
            }
        };

        return new Promise((resolve, reject) => {
            request(requestParams, (err, response, body) => {
                if (err) {
                    return reject(err);
                }

                if (response.statusCode !== 200) {
                    return reject(new errors.HttpStatusError(
                        response.statusCode, body && body.error));
                }

                resolve(body);
            });
        });
    }

    /**
     * Queries the lazy service for its version (not API version).
     */
    version() {
        const self = this;

        const requestParams = {
            method: 'GET',
            url: self._serviceUrl + '/version',
            json: true,
            headers: {
                'Accept': 'application/json'
            }
        };

        return new Promise((resolve, reject) => {
            request(requestParams, (err, response, body) => {
                if (err) {
                    return reject(err);
                }

                if (response.statusCode !== 200) {
                    return reject(new errors.HttpStatusError(
                        response.statusCode, body && body.error));
                }

                resolve(body);
            });
        });
    }
}

module.exports = LazyClientv20161128;
