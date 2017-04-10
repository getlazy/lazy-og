
'use strict';

/* global logger */

const _ = require('lodash');
const url = require('url');
const request = require('request-promise-native');
const async = require('async');
const HigherDockerManager = require('higher-docker-manager');

const DEFAULT_ARBITRARY_BOOT_TIMEOUT_S = 30;
const ARBITRARY_ENGINE_BOOT_CHECK_DELAY_MS = 100;

/**
 * Engine class.
 */
class Engine {
    /**
     * Constructs a new instance of Engine with the given name and languages.
     * @param {string} engineId ID of the engine
     * @param {Container} container Container in which this engine is running.
     * @param {Object} config Defined configuration of this engine.
     */
    constructor(engineId, container, config) {
        this._id = engineId;
        this._container = container;
        this._config = config;
    }

    /**
     * @return {string} Name of this engine, used for descriptive purposes.
     */
    get id() {
        return this._id;
    }

    /**
     * @return {Array} Array of strings with languages that this engine can analyze.
     */
    get languages() {
        return _.get(this._meta, 'languages');
    }

    /**
     * @return {string} URL on which engine can be found.
     */
    get url() {
        return this._containerUrl;
    }

    /**
     * @return {Object} Engine metadata object as returned by the engine or set in lazy.yaml.
     */
    get meta() {
        return this._meta;
    }

    /**
     * @return {Object} Engine's configuration object.
     */
    get config() {
        return this._config;
    }

    /**
     * Starts the engine.
     * @return {Promise} Promise resolved when start operation has finished.
     */
    start() {
        const self = this;

        logger.info('Starting engine', { engineId: self.id });
        return self._redirectContainerLogsToLogger()
            .then(() => self._container.status())
            .then((containerStatus) => {
                self._containerUrl = url.format({
                    protocol: 'http',
                    hostname: _.get(containerStatus, 'NetworkSettings.IPAddress'),
                    port: self._config.port
                });
            })
            .then(() =>
                //  boot_wait must be explicitly set to false for us to not wait for boot.
                (self._config.boot_wait === false ? Promise.resolve() : self._waitEngine()))
            .then(() =>
                (self._config.meta ? Promise.resolve(self._config.meta) : self._getMeta()))
            .then((meta) => {
                self._meta = meta;
            });
    }

    status() {
        const self = this;

        const requestParams = {
            method: 'GET',
            url: url.resolve(self._containerUrl, 'status'),
            json: true,
            headers: {
                Accept: 'application/json'
            }
        };

        return request(requestParams);
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
            url: url.resolve(self._containerUrl, 'file'),
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

        return request(requestParams);
    }

    _redirectContainerLogsToLogger() {
        const self = this;

        const redirectLogStreamIntoLogger = (stream) => {
            let pendingBuffers = [];
            const logAndClearPendingBuffers = () => {
                if (!_.isEmpty(pendingBuffers)) {
                    const logs = _.map(pendingBuffers, buffer =>
                        HigherDockerManager.containerOutputBuffersToString([buffer]));
                    logger.error('Dumping non-JSON logs', { engineId: self.id, logs });
                    pendingBuffers = [];
                }
            };

            const logEngineMessage = (messageData) => {
                const meta = messageData.meta || {};
                meta.engineId = self.id;
                logger.log(messageData.level, messageData.message, messageData.meta);
            };

            stream.on('data', (buffer) => {
                //  First try to parse as JSON the line as we received it. If it succeeds then it means
                //  that it was a valid and complete JSON which in turn means that pending buffers
                //  were not and we will just dump them as they were received.
                let messageJson = HigherDockerManager.containerOutputBuffersToString([buffer]);
                try {
                    const messageData = JSON.parse(messageJson);
                    logAndClearPendingBuffers();
                    logEngineMessage(messageData);
                } catch (e1) {
                    //  Since single buffer parsing failed we will now try to parse this buffer together
                    //  with all the other pending buffers.
                    pendingBuffers.push(buffer);
                    messageJson = HigherDockerManager.containerOutputBuffersToString(pendingBuffers);

                    try {
                        const messageData = JSON.parse(messageJson);
                        //  Parse succeeded so let's clear the buffers.
                        pendingBuffers = [];
                        logEngineMessage(messageData);
                    } catch (e2) {
                        //  Do nothing - we have to wait for the next buffer.
                    }
                }
            });
            stream.on('end', () => {
                //  Before ending dump all the pending buffers as they are.
                logAndClearPendingBuffers();
                logger.info('Stopped streaming logs', { engineId: self.id });
            });
            stream.on('error', (err) => {
                logger.error('Error while streaming logs for engine', { err, engineId: self.id });
            });
        };

        return self._container.logs({
            follow: true,
            stdout: true,
            stderr: true
        })
            .then(redirectLogStreamIntoLogger)
            .catch((err) => {
                logger.error('Error while setting up streaming of logs for engine',
                    { err, engineId: self.id });
                //  We don't pass the error as streaming of logs is non-critical.
            });
    }

    _waitEngine() {
        const self = this;

        //  Calculate the max number of status requests based on the longest timeout among meta,
        //  configured and default timeouts.
        const metaBootTimeout = _.get(self, '_meta.boot_timeout') || 0;
        const configBootTimeout = _.get(self, '_config.boot_timeout') || 0;
        const bootTimeoutInMs = 1000 * _.max(
            [metaBootTimeout, configBootTimeout, DEFAULT_ARBITRARY_BOOT_TIMEOUT_S]);
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
                            logger.info('Engine online', { engineId: self.id });
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
                        return reject(new Error(`Engine ${self.id} timed out.`));
                    }

                    return resolve();
                });
        });
    }

    _getMeta() {
        const requestParams = {
            method: 'GET',
            url: url.resolve(this._containerUrl, 'meta'),
            json: true,
            headers: {
                Accept: 'application/json'
            }
        };

        return request(requestParams);
    }
}

module.exports = Engine;
