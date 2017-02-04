
'use strict';

/* global logger */

const _ = require('lodash'); // lazy ignore-once lodash/import-scope
const url = require('url');
const H = require('higher');
const selectn = require('selectn');
const HigherDockerManager = require('higher-docker-manager');
const Engine = require('./engine');
const ip = require('ip');

const Label = {
    OrgGetlazyLazyEngineManagerOwner: 'org.getlazy.lazy.engine-manager.owner'
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

        //  Resolve the repository auth since its values are kept in the lazy's process environment.
        this._repositoryAuth = EngineManager._resolveRepositoryAuthValues(this._config);
    }

    stop() {
        const self = this;

        return self._deleteAllEngines()
            .then(() => {
                self._isRunning = false;
            });
    }

    start() {
        const self = this;

        return Promise.all([
            EngineManager._getOwnContainer().then(container => container.status()),
            self._findLazyVolumeOrCreateIt()])
            .then((results) => {
                [self._container, self._volume] = results;
                return self._deleteAllEngines();
            })
            .then(() => self._installAllEngines())
            .then((engines) => {
                self._engines = engines;
            })
            .then(() => {
                //  Install ui if one is specified.
                if (_.isObject(self._config.ui)) {
                    return self._installEngine('ui', self._config.ui)
                        .then((uiEngine) => {
                            self._uiEngine = uiEngine;
                        });
                }

                return Promise.resolve();
            })
            .then(() => {
                self._isRunning = true;
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

    _installAllEngines() {
        const self = this;

        return Promise.all(_.map(self._config.engines,
            (engineConfig, engineName) => self._installEngine(engineName, engineConfig)));
    }

    _installEngine(engineName, engineConfig, port) {
        const self = this;

        const imageName = engineConfig.image;
        logger.info('Pulling image', { engine: engineName, image: imageName });
        return EngineManager._pullImage(self._repositoryAuth, imageName)
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
                            `LAZY_ENGINE_NAME=${engineName}`,
                            `LAZY_SERVICE_URL=${selectn('_config.service_url', self)}`,
                            `LAZY_PRIVATE_API_URL=${url.format({
                                protocol: 'http',
                                hostname: ip.address(),
                                port: self._config.privateApiPort
                            })}`,
                            //  TODO: Fix this as special engines like UI don't follow this URL pattern.
                            `LAZY_ENGINE_URL=${selectn('_config.service_url', self)}/engine/${engineName}`,
                            `LAZY_VOLUME_NAME=${self._volume.Name}`,
                            'LAZY_VOLUME_MOUNT=/lazy',
                            `LAZY_ENGINE_SANDBOX_DIR=/lazy/sandbox/${engineName}`
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
                    Labels: {}
                };
                createEngineParams.Labels[Label.OrgGetlazyLazyEngineManagerOwner] = self._id;

                logger.info('Creating engine', {
                    engine: engineName,
                    volume: self._volume.Name
                });
                return EngineManager._createContainer(createEngineParams);
            })
            .then(engineContainer =>
                engineContainer.start()
                    .then(() => new Engine(engineName, engineContainer, engineConfig))
            )
            .then(engine => engine.start().then(_.constant(engine)));
    }

    _findLazyVolumeOrCreateIt() {
        const self = this;

        return EngineManager._getVolumesForLabel(
                Label.OrgGetlazyLazyEngineManagerOwner, self._id)
            .then((volumes) => {
                if (!_.isEmpty(volumes)) {
                    return _.head(volumes);
                }

                const volumeCreateParams = {
                    //  Name it after the unique ID.
                    name: `lazy-volume-${self._id}`,
                    Labels: {}
                };
                //  Add the label to later use it to find this container.
                volumeCreateParams.Labels[Label.OrgGetlazyLazyEngineManagerOwner] = self._id;

                return EngineManager._createVolume(volumeCreateParams);
            });
    }

    _deleteAllEngines() {
        const self = this;

        //  Stop/wait/delete all containers owned by this lazy (equivalence determined by ID)
        return EngineManager._getContainersForLabel(Label.OrgGetlazyLazyEngineManagerOwner, self._id)
            .then(containers =>
                Promise.all(_.map(containers, (container) => {
                    logger.info('Stopping/waiting/deleting engine container',
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
}

module.exports = EngineManager;
