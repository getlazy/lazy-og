
'use strict';

const _ = require('lodash');
const url = require('url');
const request = require('request');
const async = require('async');
const HigherDockerManager = require('@lazyass/higher-docker-manager');

/**
 * Engine class.
 */
class Engine
{
    /**
     * Constructs a new instance of Engine with the given name and languages.
     * @param {string} name Name of the engine
     * @param {Array} languages Array of language strings which this engine can process.
     */
    constructor(name, languages, container) {
        this._name = name;
        this._languages = languages;
        this._container = container;
    }

    /**
     * @return {string} Name of this engine, used for descriptive purposes.
     */
    get name() {
        return this._name;
    }

    /**
     * @return {Array} Array of strings with languages that this engine can analyze.
     */
    get languages() {
        return this._languages;
    }

    /**
     * Boots the engine.
     * @return {Promise} Promise resolved when boot operation has finished.
     */
    boot() {
        const self = this;

        logger.info('Booting', self.name, 'engine');
        return self._redirectContainerLogsToLogger()
            .then(() => {
                return self._container.status();
            })
            .then((containerStatus) => {
                self._engineUrl = url.format({
                    protocol: 'http',
                    host: containerStatus.Config.Hostname
                });
            })
            .then(() => {
                return self._waitEngine();
            });
    }

    status() {
        const self = this;

        const requestParams = {
            method: 'GET',
            url: self._engineUrl + '/status',
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
    }

    /**
     * Analyzes the given file content for the given language and analysis configuration.
     * This method must be overriden by the inheriting classes.
     * @param {string} host Name of the host requesting file analysis.
     * @param {string} hostPath Path of the source file on the host.
     * @param {string} language Language of the source file.
     * @param {string} content Content of the source file requesting lazy to analyze.
     * @param {string} config Name of the configuration to use.
     * @return {Promise} Promise resolving with results of the file analysis.
     */
    analyzeFile(host, hostPath, language, content, config) {
        const self = this;

        const requestParams = {
            method: 'POST',
            url: self._engineUrl + '/file',
            json: true,
            headers: {
                'Accept': 'application/json'
            },
            body: {
                host: host,
                hostPath: hostPath,
                clientPath: hostPath,
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
        })
            .then((results) => {
                return results;
            })
            .then((results) => {
                if (_.isArray(results.warnings)) {
                    results.warnings = _.map(results.warnings, (warning) => {
                        //  Add the actual client file path.
                        return _.extend(warning, {
                            filePath: hostPath
                        });
                    });
                }

                return results;
            });
    }

    /**
     * Pass through the HTTP request to engine and pass back its response. This allows clients to
     * directly communicate with engines.
     * @param {Object} req Express request object.
     * @param {Object} res Express response object.
     * @param {string} engineUrlPath Path on the engine server that is being requested directly.
     */
    passthroughRequest(req, res, engineUrlPath) {
        const self = this;

        //  Pipe the request to engine and then pipe back the response.
        req.pipe(request[_.toLower(req.method)](self._engineUrl + engineUrlPath)).pipe(res);
    }

    _redirectContainerLogsToLogger() {
        const self = this;

        const redirectLogStreamIntoLogger = (stream) => {
            stream.on('data', (buffer) => {
                logger.info('[' + self.name + ']',
                    HigherDockerManager.containerOutputBuffersToString([buffer]));
            });
            stream.on('end', () => {
                logger.info(
                    'Stopped streaming logs for engine', self.name);
            });
            stream.on('error', (err) => {
                logger.error('Error while streaming logs for engine', self.name);
            });
        };

        //  TODO: Track last received output for the container so that logs can
        //      be recaptured from that point.
        return self._container.logs({
            follow: true,
            stdout: true,
            stderr: true
        })
            .then(redirectLogStreamIntoLogger)
            .catch((err) => {
                logger.error(
                    'Error while setting up streaming of logs for engine', self.name);
                //  We don't pass the error as streaming of logs is non-critical.
            });
    }

    _waitEngine() {
        const self = this;

        //  When multiplied these two numbers give the timeout duration.
        const ARBITRARY_MAX_NUMBER_OF_STATUS_REQUESTS = 30;
        const ARBITRARY_DELAY_BETWEEN_REQUESTS_MS = 1000;

        return new Promise((resolve, reject) => {
            //  Request engine status until it starts working or times out.
            let healthyStatus = false;
            let requestCounter = 0;
            async.doWhilst(
                (next) => {
                    self.status()
                        .then(() => {
                            //  We received an error-less status so assume everything is fine.
                            healthyStatus = true;
                            next();
                        })
                        .catch(() => {
                            //  Increment the request counter and wait a bit until trying again.
                            ++requestCounter;
                            setTimeout(next, ARBITRARY_DELAY_BETWEEN_REQUESTS_MS);
                        });
                },
                () => {
                    //  Continue until we receive a healthy status or the max number of requests
                    //  is reached.
                    return !healthyStatus &&
                        requestCounter < ARBITRARY_MAX_NUMBER_OF_STATUS_REQUESTS;
                },
                (err) => {
                    if (err) {
                        return reject(err);
                    }

                    if (requestCounter === ARBITRARY_MAX_NUMBER_OF_STATUS_REQUESTS) {
                        return reject(new Error('Engine ' + self.name + ' timed out.'));
                    }

                    resolve();
                });
        });
    }
}

module.exports = Engine;
