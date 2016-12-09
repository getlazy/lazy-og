
'use strict';

const _ = require('lodash');
const url = require('url');
const request = require('request');
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
            });
    }

    // lazy next -jsdoc-no-return - TODO: Make lazy understand this and turn off the warning.
    /**
     * Analyzes the given file content for the given language and analysis configuration.
     * This method must be overriden by the inheriting classes.
     * @param {string} content Content of the source file requesting lazy to analyze.
     * @param {string} clientPath Path of the source file requesting lazy to analyze.
     * @param {string} language Language of the source file.
     * @param {string} config Name of the configuration to use.
     * @return {Promise} Promise resolving with results of the file analysis.
     */
    analyzeFile(content, clientPath, language, config) {
        const self = this;

        const requestParams = {
            method: 'POST',
            url: self._engineUrl + '/file',
            json: true,
            headers: {
                'Accept': 'application/json'
            },
            body: {
                language: language,
                clientPath: clientPath,
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
                            filePath: clientPath
                        });
                    });
                }

                return results;
            });
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
}

module.exports = Engine;
