
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
 * `_getContainerCmd`, `_processEngineOutput`, `_getBaseContainerExecParams`.
 */
class DockerizedEngine extends Engine
{
    /**
     * Constructs a new instance of DockerizedEngine.
     * @param {string} name Name of the engine
     * @param {Array} languages Array of language strings which this engine can process.
     * @param {Container} container Container on which to execute analysis.
     */
    constructor(name, languages, container) {
        super(name, languages);
        this._container = container;
    }

    /**
     * Overriden from Engine class.
     * @return {Promise} Promise that resolves when the boot process finishes.
     */
    boot() {
        //  We assign containers on which to execute at the time of the request so there is
        //  nothing that we need to do to prepare the engine.
        return Promise.resolve();
    }

    /**
     * Creates temporary file in `/lazy` directory which is (HACK) is mounted to a known shared
     * volume.
     * @param {string} content Content of the file to analyze.
     * @param {string} clientPath Path of the file on the client, used to extract the extension
     * so that temporary file and original file share it. This is useful engines that analyze
     * file extension to know which grammar to use in the analysis.
     * @return {Promise} Promise resolving with information on the temporary file.
     * @private
     */
    _createTempFileWithContent(content, clientPath) {
        return new Promise((resolve, reject) => {
            tmp.file({
                //  HACK: We hard-code the stack volume mount path to /lazy which is known to all
                //  containers.
                dir: '/lazy',
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
                        //  Cleanup callback to delete the temporary file once it's no longer
                        //  in use.
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

    /**
     * Analyzes the given file content for the given language and analysis configuration.
     * @param {string} content Content of the source file requesting lazy to analyze.
     * @param {string} clientPath Path of the source file requesting lazy to analyze.
     * @param {string} language Language of the source file.
     * @param {string} config Name of the configuration to use.
     * @return {Promise} Promise resolving with results of the file analysis.
     */
    analyzeFile(content, clientPath, language, config) {
        const self = this;

        let temporaryFileInfo;

        //  HACK: We create a temporary file with the correct extension in the
        //  temporary directory of engine container. Volume of the engine container
        //  is shared with helper container and can thus be read by it.
        //  TODO: unhack temporary directory thingamajig
        return self._createTempFileWithContent(content, clientPath)
            .then((fileInfo) => {
                temporaryFileInfo = fileInfo;

                //  Create exec parameters for the container.
                const execParams = {};
                //  Delegate parts of exec param creation to inheriting classes.
                if (_.isFunction(self._getBaseContainerExecParams)) {
                    execParams = self._getBaseContainerExecParams();
                }
                if (_.isFunction(self._getContainerEntrypoint)) {
                    execParams.Entrypoint = self._getContainerEntrypoint();
                }
                if (_.isFunction(self._getContainerCmd)) {
                    //  HACK: We hard-code the stack volume mount path to /lazy which is known to
                    //  all containers.
                    //  HACK: We always add the path to file as last argument.
                    execParams.Cmd = self._getContainerCmd().concat(
                        '/lazy/' + path.basename(temporaryFileInfo.path));
                }

                return HigherDockerManager.execInContainer(self._container, execParams);
            })
            //  Delegate the processing of the output to inheriting classes.
            .then(self._processEngineOutput)
            .then((results) => {
                if (_.isArray(results.warnings)) {
                    //  Fix the file path to use the actual client path rather than
                    //  the temporary one we used.
                    results.warnings = _.map(results.warnings, (warning) => {
                        return _.extend(warning, {
                            filePath: clientPath
                        });
                    });
                }

                return results;
            })
            .then((results) => {
                //  This is the last operation before we return the results so schedule the cleanup.
                self._scheduleDelayedCleanup(temporaryFileInfo.cleanupCallback);
                return results;
            })
            .catch((err) => {
                //  Schedule the cleanup and pass on the error.
                if (temporaryFileInfo) {
                    self._scheduleDelayedCleanup(temporaryFileInfo.cleanupCallback);
                }
                return Promise.reject(err);
            });
    };
}

module.exports = DockerizedEngine;
