
'use strict';

/* global logger */

const _ = require('lodash');
const url = require('url');
const H = require('higher');
const selectn = require('selectn');
const HigherDockerManager = require('higher-docker-manager');
const Engine = require('./engine');
const ip = require('ip');
const HelperContainerManager = require('./helper-container-manager');
const JSONparse = require('try-json-parse');

const Label = {
    OrgGetlazyLazyEngineManagerOwnerLazyId: 'org.getlazy.lazy.engine-manager.owner.lazy-id',
    OrgGetlazyLazyEngineImageMetadataJson: 'org.getlazy.lazy.engine.image-metadata.json'
};

/**
 * Manages the engines running in lazy.
 */
class EngineManager {
    constructor(config) {
        this._id = H.isNonEmptyString(config.id) ? config.id : 'default';
        this._config = config;
        this._container = null;
        this._volume = null;
        this._isRunning = false;
        this._engineHelperContainers = {};

        //  Resolve the repository auth since its values are kept in the lazy's process environment.
        this._repositoryAuth = EngineManager._resolveRepositoryAuthValues(this._config);
    }

    stop() {
        const self = this;

        return self._deleteOwnedContainers()
            .then(() => {
                self._isRunning = false;
            });
    }

    start() {
        if (this._isRunning) {
            logger.warn('EngineManager is already running.');
            return Promise.resolve();
        }

        return Promise.all([
            EngineManager._getOwnContainer().then(container => container.status()),
            this._findLazyVolumeOrCreateIt()])
            .then((results) => {
                [this._container, this._volume] = results;
                return this._deleteOwnedContainers();
            })
            .then(() => this._createEngineContainers())
            .then((engines) => {
                this._engines = engines;
            })
            .then(() => {
                //  Install ui if one is specified.
                if (_.isObject(this._config.ui)) {
                    return this._createEngineContainer('ui', this._config.ui)
                        .then((uiEngine) => {
                            this._uiEngine = uiEngine;
                        });
                }

                return Promise.resolve();
            })
            .then(() => {
                this._isRunning = true;
            });
    }

    get isRunning() {
        return this._isRunning;
    }

    get engines() {
        return this._engines;
    }

    get uiEngine() {
        return this._uiEngine;
    }

    execInEngineHelperContainer(engineId, helperId, execParams) {
        const containerId = _.get(this._engineHelperContainers, `${engineId}.${helperId}`);
        // HelperContainerManager handles unknown container IDs.
        return EngineManager._execInContainer(containerId, execParams);
    }

    _createEngineContainers() {
        const self = this;

        return Promise.all(_.map(self._config.engines,
            (engineConfig, engineId) => self._createEngineContainer(engineId, engineConfig)));
    }

    _createEngineContainer(engineId, engineConfig) {
        const self = this;

        const imageName = engineConfig.image;
        logger.info('Pulling image', { engineId, image: imageName });
        return EngineManager._pullImage(self._repositoryAuth, imageName)
            .then((image) => {
                // Create engine's helper containers from the labels the image has and any additional ones
                // specified in the engine's configuration.
                const imageMetadata = _.assign(
                    JSONparse(_.get(image, `Config.Labels.${Label.OrgGetlazyLazyEngineImageMetadataJson}`)),
                    JSONparse(_.get(engineConfig.labels, Label.OrgGetlazyLazyEngineImageMetadataJson)));
                if (_.isObject(imageMetadata) && _.isObject(imageMetadata.helper_containers)) {
                    return this._createHelperContainers(imageMetadata.helper_containers)
                        .then((helperContainersPairs) => {
                            // Convert the array of pairs into a map.
                            _.forEach(helperContainersPairs, ({ containerId, helperId }) => {
                                _.set(this._engineHelperContainers, `${engineId}.${helperId}`, containerId);
                            });
                        });
                }

                return Promise.resolve();
            })
            .then(() => {
                const createEngineParams = {
                    Image: imageName,
                    Cmd: _.isString(engineConfig.command) ? engineConfig.command.split(' ') : engineConfig.command,
                    //  Engine's environment consists of the variables set in the config,
                    //  variables imported from lazy's environment and variables created by
                    //  lazy itself.
                    Env: _.union(
                        engineConfig.env,
                        _.map(engineConfig.import_env,
                            importEnvvar => `${importEnvvar}=${process.env[importEnvvar]}`),
                        [
                            `LAZY_HOSTNAME=${_.get(self._container, 'Config.Hostname')}`,
                            `LAZY_ENGINE_ID=${engineId}`,
                            `LAZY_SERVICE_URL=${selectn('_config.service_url', self)}`,
                            `LAZY_PRIVATE_API_URL=${url.format({
                                protocol: 'http',
                                hostname: ip.address(),
                                port: self._config.privateApiPort
                            })}`,
                            //  TODO: Fix this as special engines like UI don't follow this URL pattern.
                            `LAZY_ENGINE_URL=${selectn('_config.service_url', self)}/engine/${engineId}`,
                            `LAZY_VOLUME_NAME=${self._volume.Name}`,
                            'LAZY_VOLUME_MOUNT=/lazy',
                            `LAZY_ENGINE_SANDBOX_DIR=/lazy/sandbox/${engineId}`
                        ],
                        _.isInteger(engineConfig.port) ? [`PORT=${engineConfig.port}`] : []),
                    HostConfig: {
                        //  We only allow volumes to be bound to host.
                        Binds: _.union(engineConfig.volumes, [
                            //  HACK: We hard-code the volume mount path to /lazy which is
                            //  known to all containers.
                            `${self._volume.Name}:/lazy`
                        ]),
                        RestartPolicy: {
                            Name: 'unless-stopped'
                        }
                    },
                    WorkingDir: engineConfig.working_dir,
                    Labels: H.unless(_.isObject, {}, engineConfig.labels)
                };
                createEngineParams.Labels[Label.OrgGetlazyLazyEngineManagerOwnerLazyId] = self._id;

                logger.info('Creating engine', { engineId, volume: self._volume.Name });
                return EngineManager._createContainer(createEngineParams);
            })
            .then(engineContainer =>
                engineContainer.start()
                    .then(() => new Engine(engineId, engineContainer, engineConfig))
            )
            .then(engine => engine.start().then(_.constant(engine)));
    }

    _createHelperContainer(helperId, helperConfig) {
        const imageName = helperConfig.image;
        logger.info('Creating helper container', { helper: helperId, image: imageName });
        return HelperContainerManager.createContainer(this._id, this._repositoryAuth, imageName, this._volume.Name)
            // lazy ignore arrow-body-style
            .then((containerId) => {
                return {
                    helperId,
                    containerId
                };
            });
    }

    _createHelperContainers(helperContainers) {
        return Promise.all(_.map(helperContainers,
            (helperConfig, helperId) => this._createHelperContainer(helperId, helperConfig)));
    }

    _findLazyVolumeOrCreateIt() {
        return EngineManager._getVolumesForLabel(Label.OrgGetlazyLazyEngineManagerOwnerLazyId, this._id)
            .then((volumes) => {
                if (!_.isEmpty(volumes)) {
                    return _.head(volumes);
                }

                const volumeCreateParams = {
                    //  Name it after the unique ID.
                    name: `lazy-volume-${this._id}`,
                    Labels: {}
                };
                //  Add the label to later use it to find this container.
                volumeCreateParams.Labels[Label.OrgGetlazyLazyEngineManagerOwnerLazyId] = this._id;

                return EngineManager._createVolume(volumeCreateParams);
            });
    }

    _deleteOwnedContainers() {
        const self = this;

        // Stop/wait/delete all containers owned by this lazy (equivalence determined by ID)
        // which includes engines and helper containers.
        return EngineManager._getContainersForLabel(Label.OrgGetlazyLazyEngineManagerOwnerLazyId, self._id)
            .then(containers =>
                Promise.all(_.map(containers, (container) => {
                    logger.info('Stopping/waiting/deleting container',
                        { container: _.head(container.Names) });
                    if (container.id === self._container.id) {
                        return Promise.resolve();
                    }

                    return container.stop()
                        .then(() => container.wait())
                        .then(() => container.delete());
                }))
            );
    }

    static _resolveRepositoryAuthValues(repositoryAuth) {
        const resolvedRepositoryAuth = {};
        //  Resolve the values of properties defined with _env suffix. Those properties instruct
        //  lazy to read their values from its own environment.
        _.forEach(repositoryAuth, (value, key) => {
            if (_.endsWith(key, '_env')) {
                resolvedRepositoryAuth[key.slice(0, key.length - '_env'.length)] =
                    process.env[value];
            } else {
                resolvedRepositoryAuth[key] = value;
            }
        });
        return resolvedRepositoryAuth;
    }

    /**
     * Wrapper around HigherDockerManager.pullImage for easier unit testing.
     * @private
     */
    static _pullImage(...args) {
        // istanbul ignore next
        return HigherDockerManager.pullImage(...args);
    }

    /**
     * Wrapper around HigherDockerManager.getOwnContainer for easier unit testing.
     * @private
     */
    static _getOwnContainer() {
        // istanbul ignore next
        return HigherDockerManager.getOwnContainer();
    }

    /**
     * Wrapper around HigherDockerManager.createContainer for easier unit testing.
     * @private
     */
    static _createContainer(...args) {
        // istanbul ignore next
        return HigherDockerManager.createContainer(...args);
    }

    /**
     * Wrapper around HigherDockerManager.getVolumesForLabel for easier unit testing.
     * @private
     */
    static _getVolumesForLabel(...args) {
        // istanbul ignore next
        return HigherDockerManager.getVolumesForLabel(...args);
    }

    /**
     * Wrapper around HigherDockerManager.createVolume for easier unit testing.
     * @private
     */
    static _createVolume(...args) {
        // istanbul ignore next
        return HigherDockerManager.createVolume(...args);
    }

    /**
     * Wrapper around HigherDockerManager.getContainersForLabel for easier unit testing.
     * @private
     */
    static _getContainersForLabel(...args) {
        return HigherDockerManager.getContainersForLabel(...args);
    }

    static _execInContainer(...args) {
        return HelperContainerManager.execInContainer(...args);
    }
}

module.exports = EngineManager;
