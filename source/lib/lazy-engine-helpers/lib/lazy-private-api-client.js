
'use strict';

const url = require('url');
const request = require('request-promise-native');

class LazyPrivateApiClient {
    constructor(lazyPrivateApiUrl = process.env.LAZY_PRIVATE_API_URL,
        engineId = process.env.LAZY_ENGINE_ID) {
        this._apiUrl = lazyPrivateApiUrl;
        this._engineId = engineId;
    }

    getEngineConfig() {
        return this._makeGetRequest('config', { engineId: this._engineId });
    }

    execInEngineHelperContainer(helperId, execParams) {
        return this._makePostRequest('exec-in-engine-helper-container', { engineId: this._engineId, helperId, execParams });
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

        return LazyPrivateApiClient._issueRequest(requestParams);
    }

    /**
     * Wrapper around request for easier unit testing.
     * @private
     */
    static _issueRequest(requestParams) {
        // istanbul ignore next
        return request(requestParams);
    }
}

module.exports = LazyPrivateApiClient;
