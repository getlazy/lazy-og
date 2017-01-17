'use strict';

/* global logger */

const _ = require('lodash');  // lazy ignore-once lodash/import-scope
const EngineHelpers = require('@lazyass/engine-helpers');
const npmi = require('npmi');

const EngineHttpServer = EngineHelpers.EngineHttpServer;
const LazyPrivateApiClient = EngineHelpers.LazyPrivateApiClient;

class NpmTaskEngineHttpServer extends EngineHttpServer {

    static _installTaskNpm(configuration) {
        const npmTask = _.get(configuration, 'task');
        const taskProps = _.split(npmTask, ':');
        const packageName = _.get(taskProps, '[0]');
        const packageVersion = _.get(taskProps, '[1]', 'latest');

        if (_.isNil(packageName)) {
            logger.warn('No task package provided.');
            return Promise.resolve();
        }

        return new Promise((resolve) => {
            const options = {
                name: packageName,
                version: packageVersion,
                forceInstall: false,
                npmLoad: {
                    loglevel: 'silent'
                }
            };

            logger.info(`Installing task NPM package: ${options.name} @ ${options.version}`);
            npmi(options, (err) => {
                if (err) {
                    logger.warn(`Unable to install package ${options.name} @ ${options.version}. Reason: ${err.message}`);
                } else {
                    // installed
                    logger.info(`Task NPM package ${options.name} @ ${options.version} installed successfully`);

                    try {
                        const installedTask = require(packageName); // lazy ignore ; ignore dynamic require warnings
                        resolve(installedTask);
                    } catch (error) {
                        logger.warn(`Unable to resolve package ${packageName}`, error);
                    }
                }
                resolve();
            });
        });
    }


    beforeListening() {
        const self = this;
        const client = new LazyPrivateApiClient();

        return client.getEngineConfig()
            .then((engineConfig) => {
                const taskConfig = _.get(engineConfig, 'config');
                if (_.isEmpty(taskConfig)) {
                    logger.warn('No tasks configured.');
                    return Promise.resolve();
                }
                return NpmTaskEngineHttpServer._installTaskNpm(taskConfig)
                    .then((installedTask) => {
                        self._installedTask = installedTask;
                        return Promise.resolve();
                    });
            })
            .catch((err) => {
                logger.error('Failed to configure engine.', err);
                process.exit(-1);
            });
    }

    analyzeFile(hostPath, language, content, context) {
        try {
            return this._installedTask.executeLazy(hostPath, language, content, context);
        } catch (error) {
            return Promise.reject(error);
        }
    }
}

class Engine {
    start() {
        const port = process.env.PORT || 80;
        this._server = new NpmTaskEngineHttpServer(port);
        return this._server.start();
    }

    stop() {
        return this._server.stop()
            .then(() => {
                this._server = null;
            });
    }
}

module.exports = Engine;
