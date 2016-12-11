
'use strict';

const LazyClient = require('../lazy-client');
const request = require('request');
const os = require('os');
const errors = require('common-errors');

const LAZY_API_VERSION = 'v20161128';

/**
 * Client for lazy API v20161128.
 */
class LazyClientv20161128 extends LazyClient
{
    /**
     * Returns the lazy API version with which this client works.
     */
    static get version() {
        return LAZY_API_VERSION;
    }

    /**
     * Construct new LazyClient object.
     * @param {string} serviceUrl URL to lazy service.
     * @param {string} client Name of the client (e.g. "atom") which is instantiating this object.
     * @param {string} stackId ID of lazy stack assined to this client by lazy service.
     * @param {string} host Optional name of the host on which this object is running, defaults to
     * `os.hostname()`
     */
    constructor(serviceUrl, client, stackId, host) {
        super();
        this._serviceUrl = serviceUrl;
        this._client = client;
        this._stackId = stackId;
        this._host = host || os.hostname();
    }

    /**
     * Analyzes the given file content for the given language.
     * @param {string} content Content of the source file requesting lazy to analyze.
     * @param {string} path Path of the source file requesting lazy to analyze.
     * @param {string} grammar Atom grammar of the source file.
     * @return {Promise} Promise resolving with results of the file analysis.
     */
    analyzeFile(content, path, grammar) {
        const self = this;

        const requestParams = {
            method: 'POST',
            url: self._serviceUrl + '/file',
            json: true,
            headers: {
                'Accept': 'application/json',
                'X-LazyClient-Version': LAZY_API_VERSION
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
     * Queries the lazy service for its curent version and latest API version.
     * @return {Promise} Promise resolving with API and lazy service versions.
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
