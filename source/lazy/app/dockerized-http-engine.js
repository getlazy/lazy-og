
'use strict';

const _ = require('lodash');
const request = require('request');
const url = require('url');
const selectn = require('selectn');
const H = require('higher');

const HigherDockerManager = require('@lazyass/higher-docker-manager');

const Engine = require('@lazyass/engine-helpers').Engine;

/**
 * Base class for engines running behind a dockerized HTTP server.
 * Its inheriting classes must implement get port` and
 * `_processEngineOutput` methods.
 */
class DockerizedHttpEngine extends Engine
{
    /**
     * Constructs DockerizedHttpEngine with the given name and languages.
     * @param {Object} params Parameters of the engine.
     */
    constructor(params) {
        super(params.name, params.languages);
        this._containerParams = params.container;
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
                if (_.isNull(stackContainer)) {
                    logger.fatal('lazy-engines-stack must run in a container');
                    process.exit(-1);
                }

                stackContainer = container;
                stackId = stackContainer.Labels &&
                    stackContainer.Labels['io.lazyass.lazy.stack.id'];
                if (!H.isNonEmptyString(stackId)) {
                    logger.fatal('stack ID must be defined');
                    process.exit(-2);
                }

                logger.info('Searching for containers in stack\'s network');
                return HigherDockerManager.getContainersInNetworks(
                    selectn('NetworkSettings.Networks', stackContainer));
            })
            .then((containers) => {
                logger.info('Filtering containers for', self.name);
                return HigherDockerManager.filterObjectsByLabel(containers,
                    'io.lazyass.engine.name', self.name);
            })
            .then((containers) => {
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
                    Image: self._containerParams.image,
                    Cmd: self._containerParams.command,
                    //  Env is the union of specified env params and all the other params that
                    //  we are passing to all containers.
                    Env: _.union([
                            'LAZY_STACK_ID=' + process.env.LAZY_STACK_ID,
                            'LAZY_STACK_URL=' + url.format({
                                protocol: 'http',
                                hostname: process.env.LAZY_STACK_CONTAINER_NAME
                            }),
                            'LAZY_STACK_VOLUME_NAME=' + process.env.LAZY_STACK_VOLUME_NAME,
                            'LAZY_STACK_NETWORK_NAME=' + process.env.LAZY_STACK_NETWORK_NAME,
                            'LAZY_ENGINE_CONTAINER_ID=' + stackContainer.id
                        ], self._containerParams.env),
                    HostConfig: {
                        //  When networking mode is a name of another network it's
                        //  automatically attached.
                        NetworkMode: stackNetworkName,
                        //  We only allow volumes to be bound to host.
                        Binds: _.union(self._containerParams.volumes, [
                            //  HACK: For now allow even engines to access Docker.
                            //      We will solve this with the universal sibling container
                            //      protocol (aka "docker-inception")
                            //  Bind the docker socket so that we can access host Docker
                            //  from the engine.
                            '/var/run/docker.sock:/var/run/docker.sock',
                            //  HACK: We hard-code the stack volume mount path to /lazy which is
                            //  known to all containers.
                            process.env.LAZY_STACK_VOLUME_NAME + ':/lazy'
                        ]),
                        RestartPolicy: {
                            Name: 'unless-stopped'
                        }
                    },
                    WorkingDir: self._containerParams.working_dir,
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
                return engineContainer.start()
            })
            .then((engineContainer) => {
                //  Invoke status to refresh information that has changed after the start
                //  (including Name which we need)
                return engineContainer.status();
            })
            .then((engineContainer) => {
                self._engineUrl = url.format({
                    protocol: 'http',
                    //  Docker appends slash in front of the container names.
                    hostname: _.trimStart(engineContainer.Name, '/')
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
}

module.exports = DockerizedHttpEngine;
