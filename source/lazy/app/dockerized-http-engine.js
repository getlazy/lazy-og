
'use strict';

const _ = require('lodash');
const request = require('request');
const url = require('url');
const selectn = require('selectn');

const HigherDockerManager = require('@lazyass/higher-docker-manager');

const Engine = require('./engine');

/**
 * Base class for engines running behind a dockerized HTTP server.
 * Its inheriting classes must implement get port` and
 * `_processEngineOutput` methods.
 */
class DockerizedHttpEngine extends Engine
{
    /**
     * Constructs DockerizedHttpEngine with the given name and languages.
     * @param {string} name Name of the engine
     * @param {Array} languages Array of language strings which this engine can process.
     * @param {string} imageName Name of the docker image including the tag from which the
     * engine is to be run.
     */
    constructor(name, languages, imageName) {
        super(name, languages);
        this._imageName = imageName;
    }

    /**
     * Overriden from Engine class.
     * @return {Promise} Promise resolved when boot operation has finished.
     */
    boot() {
        const self = this;

        let stackContainer;
        let stackId;

        logger.info('Booting', self.name, 'engine');
        return HigherDockerManager.getOwnContainer()
            .then((container) => {
                stackContainer = container;

                let networks;
                if (!_.isNull(stackContainer)) {
                    networks = _.keys(selectn('NetworkSettings.Networks', stackContainer));
                    const labels = selectn('Labels', stackContainer);
                    stackId = (labels && labels['io.lazyass.lazy.stack.id']) || 'N/A';
                }

                logger.info('Searching for containers in stack\'s network', networks);
                return HigherDockerManager.getContainersInNetworks(networks);
            })
            .then((containers) => {
                logger.info('Filtering containers for', self.name);
                return HigherDockerManager.filterObjectsByLabel(containers,
                    'io.lazyass.engine.name', self.name);
            })
            .then((containers) => {
                logger.info('Found', containers.length, 'containers for', self.name);

                if (!_.isEmpty(containers)) {
                    if (containers.length > 1) {
                        logger.error(
                            'There is more than one matching engine for', stackId, self.name);
                        return Promise.reject(new Error('Bad engine configuration.'));
                    }

                    return _.first(containers);
                }

                //  We need to create the engine container and start it.

                //  HACK: Get the stack network name assuming that it's the first of all
                //      the networks that stack container has access to.
                //  TODO: Fix the hack by actually searching over all the networks and
                //      finding the one with stacks ID (if any!)
                const stackNetworkName = _.first(_.keys(selectn(
                    'NetworkSettings.Networks', stackContainer)));
                logger.info('Creating engine', self.name, 'on network', stackNetworkName);

                //  Create the stack container with its volume and network.
                const createEngineParams = {
                    //  Name it after the engine name and stack.
                    name: 'lazy-stack-' + stackId + '-engine-' + self.name,
                    Image: this._imageName,
                    Volumes: {},
                    HostConfig: {
                        //  When networking mode is a name of another network it's
                        //  automatically attached.
                        NetworkMode: stackNetworkName
                    },
                    Labels: {
                        'io.lazyass.engine.name': self.name
                    }
                };

                return HigherDockerManager.createContainer(createEngineParams);
            })
            .then((engineContainer) => {
                //  This either starts the stopped container (and waits) or waits for the
                //  container that's being started to actually start.
                //  Note that "container start" doesn't mean actual engine HTTP server start
                //  and if we want to do that then we will need to create our own protocol
                //  (e.g. engine can "ping" the stack once it's actually running the server and
                //  the same thing goes for lazy - stack relationship)
                //  TODO: Implement internal start stack/engine protocol so that we can actually
                //      boot engines properly (this is needed to say retrieve other docker images
                //      which is an async operation that might take a long while)
                return engineContainer.start();
            })
            .then((engineContainer) => {
                self._engineUrl = url.format({
                    protocol: 'http',
                    //  Docker appends slash in front of the container names.
                    hostname: _.trimStart(_.first(engineContainer.Names), '/'),
                    port: self.port
                });
            });
    }

    /**
     * Overriden from Engine class.
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
