
'use strict';

const LazyClient = require('../lazy-client');
const request = require('request');
const os = require('os');

const VERSION = 'v20161128';

/**
 * Client for lazy API v20161128.
 */
class LazyClientv20161128 extends LazyClient
{
    static get version() {
        return VERSION;
    }

    constructor(serviceUrl, client, host) {
        super();
        this._serviceUrl = serviceUrl;
        this._client = client;
        this._host = host || os.hostname();
    }

    analyzeFile(content, path, grammar) {
        const self = this;

        const requestParams = {
            method: 'POST',
            url: self._serviceUrl + '/' + VERSION + '/stack/' + self._stackId + '/file',
            json: true,
            headers: {
                'Accept': 'application/json'
            },
            body: {
                version: VERSION,
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
                    let message = 'lazy service failed with ' + response.statusCode +
                        ' status code';
                    if (body && body.error) {
                        message += ' (' + body.error + ')';
                    }

                    return reject(new Error(message));
                }

                resolve(body.warnings);
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
                    let message = 'lazy service failed with ' + response.statusCode +
                        ' status code';
                    if (body && body.error) {
                        message += ' (' + body.error + ')';
                    }

                    return reject(new Error(message));
                }

                resolve(body.version);
            });
        });
    }
}

module.exports = LazyClientv20161128;
