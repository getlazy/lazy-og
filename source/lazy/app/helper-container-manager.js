
'use strict';

/* global logger */

const _ = require('lodash');
const errors = require('common-errors');
const HigherDockerManager = require('higher-docker-manager');

const Label = {
    OrgGetlazyLazyEngineManagerOwner: 'org.getlazy.lazy.engine-manager.owner'
};

/**
 * Manages helper containers which are created and run as sibling Docker containers to lazy.
 */
class HelperContainerManager {
    /**
     * Creates helper container for the given image name. This function will pull the image:tag,
     * create the container, start it and finally return HelperContainerManager instances constructed
     * with the container.
     * @param {string} lazyOwnerId ID of the lazy owner of the create helper container.
     * @param {Object} auth Authentication structure per Docker API documentation
     * @param {string} imageName Name of Docker image (including the optional tag) for which
     * helper container should be created.
     * @param {string} lazyVolumeName Name of Docker volume (or host path when testing) on which
     * to bind `/lazy` dir.
     * @return {Promise} Promise resolving with a new instance of HelperContainerManager.
     */
    static createContainer(lazyOwnerId, auth, imageName, lazyVolumeName) {
        return HelperContainerManager._pullImage(auth, imageName)
            .then(() => {
                //  Create the helper container.
                const createParams = {
                    Image: imageName,
                    //  HACK: We keep the helper image running so that we can execute our jobs in it
                    //  without starting/stopping or creating/starting/stopping temporary containers
                    Entrypoint: 'tail',
                    Cmd: '-f /dev/null'.split(' '),
                    HostConfig: {
                        Binds: [
                            //  HACK: We hard-code the volume mount path to /lazy which is
                            //  known to all containers.
                            `${lazyVolumeName}:/lazy`
                        ],
                        RestartPolicy: {
                            Name: 'unless-stopped'
                        }
                    },
                    //  HACK: We hard-code the volume mount path to /lazy which is known to
                    //  all containers.
                    WorkingDir: '/lazy',
                    Labels: {}
                };
                // Label helper container as owned by lazy with the given ID.
                // This allows lazy instance to clean up this container either when shutting down
                // or when starting (if it failed to clean it up during shutdown)
                createParams.Labels[Label.OrgGetlazyLazyEngineManagerOwner] = lazyOwnerId;

                return HelperContainerManager._createContainer(createParams);
            })
            .then(container => container.start()
                .then(_.constant(container.id)));
    }

    static execInContainer(containerId, execParams) {
        return HelperContainerManager._findContainer(containerId)
            .then(container => HelperContainerManager._execInContainer(container, execParams))
            .catch(err => Promise.reject(new errors.HttpStatusError(
                    500, `exec failed with ${err && err.message}`)));
    }

    static _findContainer(containerId) {
        return HelperContainerManager._getContainerForNameOrId(containerId)
            .then((container) => {
                if (_.isNil(container)) {
                    return Promise.reject(new errors.HttpStatusError(
                        404, 'container not found'));
                }

                return container.status()
                    .then((containerStatus) => {
                        //  If the container hasn't been created by HelperContainerManager
                        //  refuse to execute anything on it.
                        const labels = _.get(containerStatus, 'Config.Labels');
                        if (!labels ||
                            labels[Label.OrgGetlazyHelperContainerManagerOwned] !== 'true') {
                            return Promise.reject(new errors.HttpStatusError(
                                403, 'container not owned'));
                        }

                        return container;
                    });
            });
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
     * Wrapper around HigherDockerManager.getContainerForNameOrId for easier unit testing.
     * @private
     */
    static _getContainerForNameOrId(...args) {
        // istanbul ignore next
        return HigherDockerManager.getContainerForNameOrId(...args);
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
     * Wrapper around HigherDockerManager.execInContainer for easier unit testing.
     * @private
     */
    static _execInContainer(...args) {
        // istanbul ignore next
        return HigherDockerManager.execInContainer(...args);
    }
}

module.exports = HelperContainerManager;
