
'use strict';

const _ = require('lodash');
const request = require('request');
const url = require('url');

const HigherDockerManager = require('@lazyass/higher-docker-manager');

const Engine = require('./engine');

/**
 * Base class for engines running behind a dockerized HTTP server.
 * Its inheriting classes must implement get port` and
 * `_processEngineOutput` methods.
 */
class DockerizedHttpEngine extends Engine
{
    constructor(name, languages) {
        super(name, languages);
    }

    /**
     * Overriden from Engine class.
     */
    boot() {
        //  There is nothing we need to do in order to "boot" a service that's already running.
        //  Also, it makes no sense for us to check if it's really running because it could
        //  become unavailable between the boot time and use time.
        return Promise.resolve();
    }

    /**
     * Returns engine URL for a random container corresponding to the image name provided by
     * the inheriting class.
     * @return {Promise} Promise returning valid URL for the engine.
     */
    _getEngineUrl() {
        const self = this;

        return HigherDockerManager.getContainersForLabel(
            'com.docker.compose.service', self.name)
            .then((containers) => {
                //  Get a random container so that we distribute the workload randomly.
                const container = _.sample(containers);
                if (!_.isObject(container)) {
                    return Promise.reject(new Error('Failed to find container with ' +
                        self.name + ' label'));
                }

                return url.format({
                    protocol: 'http',
                    //  Docker appends slash in front of the container names.
                    hostname: _.trimStart(_.first(container.Names), '/'),
                    port: self.port
                });
            });
    }

    /**
     * Overriden from Engine class.
     */
    analyzeFile(content, clientPath, language, config) {
        const self = this;

        return self._getEngineUrl()
            .then((engineUrl) => {
                const requestParams = {
                    method: 'POST',
                    url: engineUrl + '/file',
                    json: true,
                    headers: {
                        'Accept': 'application/json'
                    },
                    body: {
                        language: language,
                        content: content,
                        config: config
                    }
                };

                return new Promise((resolve, reject) => {
                    request(requestParams, (err, response, body) => {
                        if (err) {
                            return reject(err);
                        }

                        if (response.statusCode !== 200) {
                            let message = 'HTTP engine failed with ' + response.statusCode +
                                ' status code';
                            if (body && body.error) {
                                message += ' (' + body.error + ')';
                            }

                            return reject(new Error(message));
                        }

                        resolve(body);
                    });
                });
            })
            .then((results) => {
                if (_.isFunction(self._processEngineOutput)) {
                    return self._processEngineOutput(results);
                } else {
                    return results;
                }
            })
            .then((results) => {
                results.warnings = _.map(results.warnings, (warning) => {
                    //  Add the actual client file path.
                    return _.extend(warning, {
                        filePath: clientPath
                    });
                });

                return results;
            });
    }
}

module.exports = DockerizedHttpEngine;
