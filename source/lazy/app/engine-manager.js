
'use strict';

const _ = require('lodash');
const H = require('higher');
const selectn = require('selectn');
const HigherDockerManager = require('@lazyass/higher-docker-manager');
const Engine = require('./engine');

const Label = {
    IoLazyassLazyEngineManagerOwned: 'io.lazyass.lazy.engine-manager.owned',
    IoLazyassLazyEngineManagerVersion: 'io.lazyass.lazy.engine-manager.version',
    IoLazyassLazyEngineLanguages: 'io.lazyass.lazy.engine.languages'
};

/**
 * Manages the engines running in lazy.
 */
class EngineManager
{
    constructor(config) {
        this._id = H.isNonEmptyString(config.id) ? config.id : 'default';
        this._config = config;
        this._container = null;
        this._network = null;
        this._volume = null;
    }

    stop() {
        const self = this;

        return self._deleteAllEngines();
    }

    start() {
        //  1.  Check if lazy's network exists (unique ID read from envvars)
        //  1a. If the network exists, delete *all* containers within it.
        //      TODO: Delete recurively all containers and networks within lazy network.
        //  1b. If the network doesn't exist, create it and join lazy container to it.
        //  2.  Check if lazy's volume exists (unique ID read from envvars)
        //  2a. If the volume doesn't exist, create it.
        //  3.  Create new containers for all the engines and start them.

        const self = this;

        return Promise.all([HigherDockerManager.getOwnContainer(),
            self._findLazyNetworkOrCreateIt(),
            self._findLazyVolumeOrCreateIt()])
            .then((results) => {
                [self._container, self._network, self._volume] = results;
                return self._deleteAllEngines();
            })
            .then(() => {
                return self._joinContainerToNetwork();
            })
            .then(() => {
                return self._installAllEngines();
            })
            .then((engines) => {
                self._engines = engines;
            });
    }

    get engines() {
        return this._engines;
    }

    _installAllEngines() {
        const self = this;

        return Promise.all(
            _.map(self._config.engines, (engineConfig, engineName) => {
                return self._installEngine(engineName, engineConfig);
            }));
    }

    _installEngine(engineName, engineConfig) {
        const self = this;

        const imageName = engineConfig.image;
        let repositoryAuth = {};
        if (!_.isEmpty(engineConfig.repository_auth)) {
            repositoryAuth = engineConfig.repository_auth;
        } else if (!_.isEmpty(self._config.repository_auth)) {
            repositoryAuth = self._config.repository_auth;
        }

        logger.info('Pulling image', imageName, 'for engine', engineName);
        return HigherDockerManager.pullImage(repositoryAuth, imageName)
            .then((engineImage) => {
                const createEngineParams = {
                    Image: imageName,
                    Cmd: engineConfig.command ? engineConfig.command.split(' ') : undefined,
                    Env: _.union(engineConfig.env, [
                        'LAZY_VOLUME_NAME=' + self._volume.Name,
                        'LAZY_VOLUME_MOUNT=/lazy'
                    ]),
                    HostConfig: {
                        //  When networking mode is a name of another network it's
                        //  automatically attached.
                        NetworkMode: self._network.Name,
                        //  We only allow volumes to be bound to host.
                        Binds: _.union(engineConfig.volumes, [
                            //  Bind the docker socket so that we can access host Docker
                            //  from the engine and launch helper containers.
                            '/var/run/docker.sock:/var/run/docker.sock',
                            //  HACK: We hard-code the volume mount path to /lazy which is
                            //  known to all containers.
                            self._volume.Name + ':/lazy'
                        ]),
                        RestartPolicy: {
                            Name: 'unless-stopped'
                        }
                    },
                    WorkingDir: engineConfig.working_dir,
                    Labels: engineConfig.labels || {}
                };
                //  Add labels.
                createEngineParams.Labels[Label.IoLazyassLazyEngineManagerOwned] = 'true';
                //  Copy the languages label from the image into container so that we can use
                //  the metadata.
                if (engineImage.Config.Labels[Label.IoLazyassLazyEngineLanguages]) {
                    createEngineParams.Labels[Label.IoLazyassLazyEngineLanguages] =
                        engineImage.Config.Labels[Label.IoLazyassLazyEngineLanguages];
                }

                logger.info('Creating engine', {
                    engine: engineName,
                    network: self._network.Name,
                    volume: self._volume.Name
                });
                return HigherDockerManager.createContainer(createEngineParams);
            })
            .then((engineContainer) => {
                return engineContainer.start()
                    .then(() => {
                        return engineContainer.status();
                    })
                    .then((engineContainerStatus) => {
                        const languagesLabel = engineContainerStatus.Config.Labels
                            [Label.IoLazyassLazyEngineLanguages];
                        const languages = H.isNonEmptyString(languagesLabel) ?
                            languagesLabel.split(',') : [];

                        return new Engine(engineName, languages, engineContainer);
                    });
            })
            .then((engine) => {
                return engine.boot()
                    .then(() => {
                        return engine;
                    });
            });
    }

    getEngineHelp(engineName) {
        return Promise.reject(new Error('Not Implemented'));
    }

    getEngineInfo(engineName) {
        return Promise.reject(new Error('Not Implemented'));
    }

    _findLazyVolumeOrCreateIt() {
        const self = this;

        return HigherDockerManager.getVolumesForLabel(
                Label.IoLazyassLazyEngineManagerOwned, self._id)
            .then((volumes) => {
                if (!_.isEmpty(volumes)) {
                    return _.first(volumes);
                }

                const volumeCreateParams = {
                    //  Name it after the unique ID.
                    name: 'lazy-volume-' + self._id,
                    Labels: {}
                };
                //  Add the label to later use it to find this container.
                volumeCreateParams.Labels[Label.IoLazyassLazyEngineManagerOwned] = self._id;

                return HigherDockerManager.createVolume(volumeCreateParams);
            });
    }

    _findLazyNetworkOrCreateIt() {
        const self = this;

        return HigherDockerManager.getNetworksForLabel(
                Label.IoLazyassLazyEngineManagerOwned, self._id)
            .then((networks) => {
                if (!_.isEmpty(networks)) {
                    return _.first(networks);
                }

                const networkCreateParams = {
                    //  Name it after the unique ID.
                    name: 'lazy-network-' + self._id,
                    Labels: {}
                };
                //  Add the label to later use it to find this container.
                networkCreateParams.Labels[Label.IoLazyassLazyEngineManagerOwned] = self._id;

                return HigherDockerManager.createNetwork(networkCreateParams);
            });
    }

    _deleteAllEngines() {
        const self = this;

        //  Stop/wait/delete all containers in the lazy network except our own container.
        return HigherDockerManager.getContainersInNetworks([self._network.Name])
            .then((containers) => {
                return Promise.all(_.map(containers, (container) => {
                    logger.info('Stopping/waiting/deleting engine container',
                        _.first(container.Names));
                    if (container.id === self._container.id) {
                        return Promise.resolve();
                    }

                    return container.stop()
                        .then(() => {
                            return container.wait();
                        })
                        .then(() => {
                            return container.delete();
                        });
                }));
            });
    }

    _joinContainerToNetwork() {
        const self = this;

        //  Join lazy container to lazy network so that all engines are reachable.
        //  Names of the networks are keys in NetworkSettings.Networks structure.
        const lazyNetworksNames =
            _.keys(selectn('NetworkSettings.Networks', self._container));

        //  Check if the lazy container is already attached to lazy's network
        const alreadyAttachedToLazyNetwork = _.some(lazyNetworksNames,
            (networkName) => networkName === self._network.Name);
        if (alreadyAttachedToLazyNetwork) {
            return;
        }

        //  Connect the lazy container to the lazy network.
        return self._network.connect({
            Container: self._container.id
        });
    }
}

module.exports = EngineManager;
