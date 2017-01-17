'use strict';

/* global logger */
// lazy ignore lodash/chaining
// lazy ignore lodash/chain-style

const _ = require('lodash');  // lazy ignore-once lodash/import-scope
const EngineHelpers = require('@lazyass/engine-helpers');
const npmi = require('npmi');

const EngineHttpServer = EngineHelpers.EngineHttpServer;
const LazyPrivateApiClient = EngineHelpers.LazyPrivateApiClient;

class TaskRunnerEngineHttpServer extends EngineHttpServer {

    static _installOneTask(taskObj, taskName) {
        let packageName;
        let packageVersion;

        if (_.isString(taskObj)) {
            // Task is configured as string.
            // Split the definition into name and version
            const taskProps = _.split(taskObj, ':');
            packageName = _.get(taskProps, '[0]');
            packageVersion = _.get(taskProps, '[1]', 'latest');
        } else {
            packageName = _.get(taskObj, 'packageName');
            packageVersion = _.get(taskObj, 'packageVersion', 'latest');
        }
        if (_.isNil(packageName)) {
            logger.warn(`No package definition for task ${taskName}`);
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

            logger.info(`Installing NPM package for task ${taskName}: ${options.name} @ ${options.version}`);
            npmi(options, (err) => {
                if (err) {
                    logger.warn(taskName, `Unable to install package ${options.name} @ ${options.version}. Reason: ${err.message}`);
                } else {
                    // installed
                    logger.info(`NPM package ${options.name} @ ${options.version} for task ${taskName} installed successfully`);

                    try {
                        const installedTask = {};
                        _.set(installedTask, taskName, require(packageName)); // lazy ignore ; ignore dynamic require warnings
                        resolve(installedTask);
                    } catch (error) {
                        logger.warn(`Unable to resolve package ${packageName}`, error);
                    }
                }
                resolve();
            });
        });
    }

    static _installTaskNPMs(configuration) {
        const allTasks = _.get(configuration, 'tasks', []);
        return Promise.all(
            _.map(allTasks, (taskObj, taskName) => TaskRunnerEngineHttpServer._installOneTask(taskObj, taskName))
        );
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
                // run through all tasks and install NPM packages
                return TaskRunnerEngineHttpServer._installTaskNPMs(taskConfig)
                    .then((installedTasks) => {
                        self._installedTasks = _.compact(installedTasks);
console.log(self._installedTasks);                        
                        return Promise.resolve();
                    });
            })
            .catch((err) => {
                logger.error('Failed to configure engine.', err);
                process.exit(-1);
            });
    }

    _executeTask(taskName, hostPath, language, content, context) {
        const task = _.find(this._installedTasks, taskName);
        const taskObj = _.get(task, taskName);
        return taskObj.executeLazy(hostPath, language, content, context);
    }

    /**
     * Analyzes the given file content for the given language and analysis configuration.
     * @param {string} hostPath Path of the source file requesting lazy to analyze.
     * @param {string} language Language of the source file.
     * @param {string} content Content of the source file requesting lazy to analyze.
     * @param {string} context Context information included with the request.
     * @return {Promise} Promise resolving with results of the file analysis.
     */
    analyzeFile(hostPath, language, content, context) {
        const self = this;
        const newContext = _.cloneDeep(context) || {};
        const listOfTasksToRun = _.get(context, 'engineParams.tasks');

        // Treat both string (one task) and sequence of tasks in the same way
        const tasksToRun = (_.isString(listOfTasksToRun)) ? [listOfTasksToRun] : listOfTasksToRun;

        // Execute tasks sequentially
        return _.reduce(tasksToRun, (prevTask, nextTask) => prevTask.then((prevTaskResults) => {
            newContext.previousStepResults = prevTaskResults;
            return self._executeTask(nextTask, hostPath, language, content, newContext);
        }), Promise.resolve());
    }
}

class Engine {
    start() {
        const port = process.env.PORT || 80;
        this._server = new TaskRunnerEngineHttpServer(port);
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
