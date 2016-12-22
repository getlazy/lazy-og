
'use strict';

/* global logger */

const _ = require('lodash');
const url = require('url');
const request = require('request');
const async = require('async');
const selectn = require('selectn');
const HigherDockerManager = require('@lazyass/higher-docker-manager');

const DEFAULT_ARBITRARY_BOOT_TIMEOUT_S = 30;
const ARBITRARY_ENGINE_BOOT_CHECK_DELAY_MS = 100;

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
    constructor(name, languages, container, config) {
        this._name = name;
        this._languages = languages;
        this._container = container;
        this._config = config;
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
     * @return {string} URL on which engine can be found.
     */
    get url() {
        return this._containerUrl;
    }

    /**
     * Boots the engine.
     * @return {Promise} Promise resolved when boot operation has finished.
     */
    boot() {
        const self = this;

        logger.info('Booting', self.name, 'engine');
        return self._redirectContainerLogsToLogger()
            .then(() => self._container.status())
            .then((containerStatus) => {
                self._containerUrl = url.format({
                    protocol: 'http',
                    host: containerStatus.Config.Hostname
                });
            })
            .then(() => self._waitEngine());
    }

    status() {
        const self = this;

        const requestParams = {
            method: 'GET',
            url: `${self._containerUrl}/status`,
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
                    let message = `HTTP engine failed with ${response.statusCode} status code`;
                    if (body && body.error) {
                        message += ` (${body.error})`;
                    }

                    return reject(new Error(message));
                }

                return resolve(body);
            });
        });
    }

    /**
     * Analyzes the given file content for the given language and analysis context.
     * This method must be overriden by the inheriting classes.
     * @param {string} hostPath Path of the source file on the host.
     * @param {string} language Language of the source file.
     * @param {string} content Content of the source file requesting lazy to analyze.
     * @param {Object} context Context information included with the request.
     * @return {Promise} Promise resolving with results of the file analysis.
     */
    analyzeFile(hostPath, language, content, context) {
        const self = this;

        const requestParams = {
            method: 'POST',
            url: `${self._containerUrl}/file`,
            json: true,
            headers: {
                Accept: 'application/json'
            },
            body: {
                hostPath,
                language,
                content,
                context
            }
        };

        return new Promise((resolve, reject) => {
            request(requestParams, (err, response, body) => {
                if (err) {
                    return reject(err);
                }

                if (response.statusCode !== 200) {
                    let message = `HTTP engine failed with ${response.statusCode} status code`;
                    if (body && body.error) {
                        message += ` (${body.error})`;
                    }

                    return reject(new Error(message));
                }

                return resolve(body);
            });
        })
            .then((results) => {
                const processedWarnings = {};
                if (_.isArray(results.warnings)) {
                    /* eslint arrow-body-style: off */
                    processedWarnings.warnings = _.map(results.warnings, (warning) => {
                        //  Add the actual client file path.
                        return _.assignIn(warning, {
                            filePath: hostPath
                        });
                    });
                }

                return processedWarnings;
            });
    }

    _redirectContainerLogsToLogger() {
        const self = this;

        const redirectLogStreamIntoLogger = (stream) => {
            stream.on('data', (buffer) => {
                logger.info(`[${self.name}]`,
                    HigherDockerManager.containerOutputBuffersToString([buffer]));
            });
            stream.on('end', () => {
                logger.info(
                    'Stopped streaming logs for engine', self.name);
            });
            stream.on('error', (err) => {
                logger.error('Error while streaming logs for engine', self.name, err);
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
                    'Error while setting up streaming of logs for engine', self.name, err);
                //  We don't pass the error as streaming of logs is non-critical.
            });
    }

    _waitEngine() {
        const self = this;

        //  Calculate the max number of status requests based on the configured timeout or
        //  if timeout hasn't been configured, then use the default.
        const bootTimeoutInMs = 1000 * (selectn('_config.boot_timeout', self) ||
            DEFAULT_ARBITRARY_BOOT_TIMEOUT_S);
        const maxNumberOfStatusRequests = bootTimeoutInMs / ARBITRARY_ENGINE_BOOT_CHECK_DELAY_MS;

        //  Request engine status until it starts working or times out.
        return new Promise((resolve, reject) => {
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
                            requestCounter += 1;
                            setTimeout(next, ARBITRARY_ENGINE_BOOT_CHECK_DELAY_MS);
                        });
                },
                //  Continue until we receive a healthy status or the max number of requests
                //  is reached.
                () => !healthyStatus && requestCounter < maxNumberOfStatusRequests,
                (err) => {
                    if (err) {
                        return reject(err);
                    }

                    if (requestCounter === maxNumberOfStatusRequests) {
                        return reject(new Error(`Engine ${self.name} timed out.`));
                    }

                    return resolve();
                });
        });
    }
}

module.exports = Engine;
