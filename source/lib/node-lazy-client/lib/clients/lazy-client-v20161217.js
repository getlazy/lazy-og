
'use strict';

const LazyClient = require('../lazy-client');
const request = require('request');
const os = require('os');
const errors = require('common-errors');

const LAZY_API_VERSION = 'v20161217';

/**
 * Client for lazy API v20161217.
 */
class LazyClientv20161217 extends LazyClient
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
     * @param {string} language Language of the source file which we want to analyze. Note that a
     * single file may have more than one language though currently such analysis has to be done
     * per-language rather than all at once.
     * @return {Promise} Promise resolving with results of the file analysis.
     */
    analyzeFile(content, path, language) {
        const self = this;

        const requestParams = {
            method: 'POST',
            url: `${self._serviceUrl}/file`,
            json: true,
            headers: {
                Accept: 'application/json',
                'X-LazyClient-Version': LAZY_API_VERSION
            },
            body: {
                hostPath: path,
                language,
                content,
                context: {
                    host: self._host,
                    client: self._client
                }
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

                return resolve(body);
            });
        });
    }

    getEngines() {
        return this._getService('engines');
    }

    /**
     * Queries the lazy service for its curent version and latest API version.
     * @return {Promise} Promise resolving with API and lazy service versions.
     */
    getVersion() {
        return this._getService('version');
    }

    getEngineMeta(engineUrl) {
        return this._getEngine(engineUrl, 'meta');
    }

    _getService(path, qs) {
        return this._get(`${this._serviceUrl}/${path}`, qs);
    }

    _getEngine(engineUrl, path, qs) {
        return this._get(`${engineUrl}/${path}`, qs);
    }

    /* eslint class-methods-use-this: off */
    _get(url, qs) {
        const requestParams = {
            method: 'GET',
            url,
            qs,
            json: true,
            headers: {
                Accept: 'application/json'
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

                return resolve(body);
            });
        });
    }
}

module.exports = LazyClientv20161217;
