
'use strict';

const _ = require('lodash');
const tmp = require('tmp');
const fs = require('fs');
const path = require('path');

const HigherDockerManager = require('@lazyass/higher-docker-manager');

const Engine = require('./engine');

/**
 * Base class for engines running as sibil Docker containers.
 * Parameters of the container run as well processing of the results
 * are delegated to inheriting classes through a set of methods that
 * they need to implement. Those methods are: `_getContainerEntrypoint`,
 * `_getContainerCmd`, `_processEngineOutput`.
 */
class DockerizedEngine extends Engine
{
    constructor(name, languages) {
        super(name, languages);
    }

    /**
     * Overriden from Engine class.
     */
    boot() {
        //  We assign containers on which to execute at the time of the request so there is
        //  nothing that we need to do to prepare the engine.
        return Promise.resolve();
    }

    _createTempFileWithContent(content, clientPath) {
        return new Promise((resolve, reject) => {
            tmp.file({
                prefix: 'lazy-temp-content-',
                //  Use the real extension to allow engines to discern between different grammars.
                postfix: path.extname(clientPath)
            }, (err, tempFilePath, fd, cleanupCallback) => {
                if (err) {
                    return reject(err);
                }

                fs.writeFile(tempFilePath, content, (err) => {
                    if (err) {
                        return reject(err);
                    }

                    resolve({
                        path: tempFilePath,
                        cleanupCallback: cleanupCallback
                    });
                });
            });
        });
    };

    /**
     * Schedules and performs the cleanup after the analysis. This operation doesn't
     * fail as there is nothing we can do about failed cleanup. The cleanup is
     * delayed as it is noop from the point of view of the analysis and we want
     * to return the results as soon as possible.
     * @param {function} temporaryFileCleanupCallback callback to be used to cleanup temporary file
     * when it is no longer needed
     */
    _scheduleDelayedCleanup(temporaryFileCleanupCallback) {
        setImmediate(() => {
            try {
                temporaryFileCleanupCallback && temporaryFileCleanupCallback();
            } catch(e) {
                logger.error('Failed to cleanup temporary file', e);
                //  Don't pass on this error - there is nothing we can do about it.
            }
        });
    };

    _getContainerForExec() {
        const self = this;

        return HigherDockerManager.getContainersForLabel(
            'com.docker.compose.service', self.name)
            .then((containers) => {
                //  Get a random element so that we distribute the workload randomly.
                //  TODO: Figure out a better way to distribute the workload as this fixes the
                //      container at the time of the boot.
                const container = _.sample(containers);
                if (!_.isObject(container)) {
                    return Promise.reject(new Error('Failed to find container with ' +
                        self.name + ' label'));
                }
                return container;
            });
    }

    analyzeFile(content, clientPath, language, config) {
        const self = this;

        let temporaryFileInfo;

        //  HACK: We create a temporary file with the correct extension in the
        //  temporary directory of lazy container which is mounted to the temporary
        //  directory of the host and then we run EMCC container where we map
        //  the host's temporary directory to `/src` so that we can run the analysis
        //  through the sibling (EMCC) container. This all depends on both knowing
        //  temporary directory names on host and on lazy container.
        //  Also see docker-compose.yaml for how this was enabled.
        //  TODO: unhack temporary directory thingamajig
        return self._createTempFileWithContent(content, clientPath)
            .then((fileInfo) => {
                temporaryFileInfo = fileInfo;

                return self._getContainerForExec();
            })
            .then((container) => {
                //  Create exec parameters for the container.
                const execParams = {};
                if (_.isFunction(self._getContainerEntrypoint)) {
                    execParams.Entrypoint = self._getContainerEntrypoint();
                }
                if (_.isFunction(self._getContainerCmd)) {
                    //  HACK: Add temporary file path as the last parameter. This might not
                    //      always work at which point we will need to refactor.
                    execParams.Cmd = self._getContainerCmd().concat(
                        '/src/' + path.basename(temporaryFileInfo.path));
                }

                return HigherDockerManager.execInContainer(container, execParams);
            })
            //  Delegate the processing of the output to inheriting classes.
            .then(self._processEngineOutput)
            .then((results) => {
                //  Fix the file path to use the actual client path rather than
                //  the temporary one we used.
                results.warnings = _.map(results.warnings, (warning) => {
                    return _.extend(warning, {
                        filePath: clientPath
                    });
                });

                return results;
            })
            .then((results) => {
                //  This is the last operation before we return the results so schedule the cleanup.
                self._scheduleDelayedCleanup(temporaryFileInfo.cleanupCallback);
                return results;
            })
            .catch((err) => {
                //  Schedule the cleanup and pass on the error.
                self._scheduleDelayedCleanup(temporaryFileInfo.cleanupCallback);
                return Promise.reject(err);
            });
    };
}

module.exports = DockerizedEngine;
