
'use strict';

/* global logger */

const _ = require('lodash');
const fs = require('fs');
const tmp = require('tmp');
const path = require('path');
const mkdirp = require('mkdirp-then');

const LazyPrivateApiClient = require('./lazy-private-api-client');

//  HACK: We hard-code the path instead of using sandbox path which "belongs"
const TEMPORARY_DIR_LAZY_PATH = '/lazy/tmp';

/* eslint class-methods-use-this: off */

/**
 * Base class for helper containers running as sibil Docker containers.
 * Parameters of the container run as well processing of the results
 * are delegated to inheriting classes through a set of methods that
 * they need to implement. Those methods are: `_getContainerEntrypoint`,
 * `_getContainerCmd`, `_processContainerOutput`, `_getBaseContainerExecParams`.
 */
class HelperContainer
{
    /**
     * Creates helper container for the given image name. This function will pull the image:tag,
     * create the container, start it and finally return HelperContainer instances constructed
     * with the container.
     * @param {Object} auth Authentication structure per Docker API documentation
     * @param {string} imageName Name of Docker image (including the optional tag) for which
     * helper container should be created.
     * @param {string} lazyVolumeName Name of Docker volume (or host path when testing) on which
     * to bind `/lazy` dir.
     * @return {Promise} Promise resolving with a new instance of HelperContainer.
     */
    static createContainer(auth, imageName, lazyVolumeName) {
        // istanbul ignore next
        const client = new LazyPrivateApiClient();
        // istanbul ignore next
        return client.createHelperContainer(auth, imageName, lazyVolumeName);
    }

    static deleteContainer(containerId) {
        // istanbul ignore next
        const client = new LazyPrivateApiClient();
        // istanbul ignore next
        return client.deleteHelperContainer(containerId);
    }

    /**
     * Constructs a new instance of HelperContainer.
     * @param {string} containerId ID of the helper container on which to execute analysis.
     */
    constructor(containerId) {
        this._containerId = containerId;
    }

    /**
     * Creates temporary file in `/lazy` directory which is (HACK) is mounted to a known shared
     * volume.
     * @param {string} content Content of the file to analyze.
     * @param {string} hostPath Path of the file on the client, used to extract the extension
     * so that temporary file and original file share it. This is useful to engines that analyze
     * file extension to know which grammar to use in the analysis.
     * @return {Promise} Promise resolving with information on the temporary file.
     * @private
     */
    static _createTempFileWithContent(content, hostPath) {
        // istanbul ignore next
        return new Promise((resolve, reject) => {
            tmp.file({
                //  HACK: We hard-code the volume mount path to /lazy which is known to all
                //  containers.
                dir: TEMPORARY_DIR_LAZY_PATH,
                prefix: 'lazy-temp-content-',
                //  Use the real extension to allow engine to discern between different grammars.
                postfix: path.extname(hostPath)
            }, (err, tempFilePath, fd, cleanupCallback) => {
                if (err) {
                    return reject(err);
                }

                return fs.writeFile(tempFilePath, content, (writeFileErr) => {
                    if (writeFileErr) {
                        return reject(writeFileErr);
                    }

                    return resolve({
                        path: tempFilePath,
                        //  Cleanup callback to delete the temporary file once it's no longer
                        //  in use.
                        cleanupCallback
                    });
                });
            });
        });
    }

    /**
     * Schedules and performs the cleanup after the analysis. This operation doesn't
     * fail as there is nothing we can do about failed cleanup. The cleanup is
     * delayed as it is noop from the point of view of the analysis and we want
     * to return the results as soon as possible.
     * @param {function} temporaryFileCleanupCallback callback to be used to cleanup temporary file
     * when it is no longer needed
     * @private
     */
    static _scheduleDelayedCleanup(temporaryFileCleanupCallback) {
        setImmediate(() => {
            try {
                if (_.isFunction(temporaryFileCleanupCallback)) {
                    temporaryFileCleanupCallback();
                }
            } catch (e) {
                // istanbul ignore next
                logger.error('Failed to cleanup temporary file', e);
                //  Don't pass on this error - there is nothing we can do about it.
            }
        });
    }

    /**
     * Analyzes the given file content for the given language and analysis configuration.
     * @param {string} hostPath Path of the source file requesting lazy to analyze.
     * @param {string} language Language of the source file.
     * @param {string} content Content of the source file requesting lazy to analyze.
     * @return {Promise} Promise resolving with results of the file analysis.
     */
    analyzeFile(hostPath, language, content) {
        const self = this;

        let temporaryFileInfo;

        //  HACK: We create a temporary file with the correct extension in the
        //  temporary directory of engine container. Volume of the engine container
        //  is shared with helper container and can thus be read by it.
        //  TODO: unhack temporary directory thingamajig
        return HelperContainer._mkdirp()
            .then(() => HelperContainer._createTempFileWithContent(content, hostPath))
            .then((fileInfo) => {
                temporaryFileInfo = fileInfo;

                //  Create exec parameters for the container.
                let execParams = {};
                //  Delegate parts of exec param creation to inheriting classes.
                // istanul ignore else
                if (_.isFunction(self._getBaseContainerExecParams)) {
                    execParams = self._getBaseContainerExecParams();
                }
                // istanul ignore else
                if (_.isFunction(self._getContainerEntrypoint)) {
                    execParams.Entrypoint = self._getContainerEntrypoint();
                }
                // istanul ignore else
                if (_.isFunction(self._getContainerCmd)) {
                    execParams.Cmd = self._getContainerCmd();
                }

                //  HACK: We hard-code the volume mount path to /lazy which is known to
                //  all containers.
                //  HACK: We always add the path to file as last argument.
                if (!_.isArray(execParams.Cmd)) {
                    execParams.Cmd = [];
                }
                execParams.Cmd = execParams.Cmd
                    .concat(`${TEMPORARY_DIR_LAZY_PATH}/${path.basename(temporaryFileInfo.path)}`);

                return HelperContainer._execInContainer(self._containerId, execParams);
            })
            //  Delegate the processing of the output to inheriting classes.
            .then((containerOutput) => {
                if (_.isFunction(self._processContainerOutput)) {
                    return self._processContainerOutput(containerOutput);
                }

                return null;
            })
            .then((results) => {
                if (_.isNil(results)) {
                    return [];
                }

                const processedResults = _.cloneDeep(results);
                // istanbul ignore else
                if (_.isArray(processedResults.warnings)) {
                    //  Fix the file path to use the actual client path rather than
                    //  the temporary one we used.
                    processedResults.warnings = _.map(processedResults.warnings, warning =>
                        _.assignIn(warning, {
                            filePath: hostPath
                        })
                    );
                }

                return processedResults;
            })
            .then((results) => {
                //  This is the last operation before we return the results so schedule the cleanup.
                HelperContainer._scheduleDelayedCleanup(temporaryFileInfo.cleanupCallback);
                return results;
            })
            .catch((err) => {
                //  Schedule the cleanup and pass on the error.
                // istanbul ignore else
                if (temporaryFileInfo) {
                    HelperContainer._scheduleDelayedCleanup(temporaryFileInfo.cleanupCallback);
                }
                return Promise.reject(err);
            });
    }

    /**
     * Wrapper around LazyPrivateApiClient.execInContainer for easier unit testing.
     * @private
     */
    static _execInContainer(...args) {
        // istanbul ignore next
        const client = new LazyPrivateApiClient();
        // istanbul ignore next
        return client.execInHelperContainer(...args);
    }

    /**
     * Wrapper around mkdirp for easier unit testing.
     * @private
     */
    static _mkdirp() {
        // istanbul ignore next
        return mkdirp(TEMPORARY_DIR_LAZY_PATH);
    }
}

module.exports = HelperContainer;
