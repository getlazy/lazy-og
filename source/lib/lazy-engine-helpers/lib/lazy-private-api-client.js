
'use strict';

const url = require('url');
const request = require('request-promise-native');

class LazyPrivateApiClient
{
    constructor(lazyPrivateApiUrl = process.env.LAZY_PRIVATE_API_URL,
        engineName = process.env.LAZY_ENGINE_NAME) {
        this._apiUrl = lazyPrivateApiUrl;
        this._engineName = engineName;
    }

    getEngineConfig() {
        return this._makeGetRequest('config', { engine: this._engineName });
    }

    /**
     * Requests lazy private API to create helper container for the given image name.
     * @param {Object} auth Authentication structure per Docker API documentation
     * @param {string} imageName Name of Docker image (including the optional tag) for which
     * helper container should be created.
     * @param {string} lazyVolumeName Name of Docker volume (or host path when testing) on which
     * to bind `/lazy` dir.
     * @return {Promise} Promise resolving with container ID.
     */
    createHelperContainer(auth, imageName, lazyVolumeName) {
        return this._makePostRequest('helper-container/create', { auth, imageName, lazyVolumeName })
            .then(response => response.containerId);
    }

    deleteHelperContainer(containerId) {
        return this._makePostRequest('helper-container/delete', { containerId })
            .then(response => response.containerId);
    }

    execInHelperContainer(containerId, execParams) {
        return this._makePostRequest('helper-container/exec', { containerId, execParams });
    }

    _makePostRequest(path, body, qs) {
        return this._makeRequest('POST', path, qs, body);
    }

    _makeGetRequest(path, qs) {
        return this._makeRequest('GET', path, qs);
    }

    _makeRequest(method, path, qs, body) {
        const requestParams = {
            method,
            url: url.resolve(this._apiUrl, path),
            json: true,
            headers: {
                Accept: 'application/json'
            },
            qs,
            body
        };

        return this._issueRequest(requestParams);
    }

    /**
     * Wrapper around request for easier unit testing.
     * @private
     */
    _issueRequest(requestParams) {
        // istanbul ignore next
        return request(requestParams);
    }
}

module.exports = LazyPrivateApiClient;
