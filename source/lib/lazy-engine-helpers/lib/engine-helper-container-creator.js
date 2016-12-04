
'use strict';

const _ = require('lodash');
const selectn = require('selectn');
const HigherDockerManager = require('@lazyass/higher-docker-manager');

class EngineHelperContainerCreator
{
    static create(imageName) {
        return HigherDockerManager.pullImage(imageName)
            .then(() => {
                return HigherDockerManager.getOwnContainer();
            })
            .then((engineContainer) => {
                //  Get the engine network name assuming that it's the first of all the networks
                //  that engine container has access to. This is a safe assumption as engines should
                //  be attached only to stack networks.
                const engineNetworkName = _.first(_.keys(selectn(
                    'NetworkSettings.Networks', engineContainer)));

                //  Create the helper container.
                const createHelperParams = {
                    //  Name it after the engine name and stack.
                    Image: imageName,
                    //  We keep the helper image running so that we can execute our jobs in it
                    //  without starting/stopping or creating/starting/stopping temporary containers
                    Entrypoint: 'tail',
                    Cmd: '-f /dev/null'.split(' '),
                    VolumesFrom: [_.trimStart(_.first(engineContainer.Names), '/')],
                    HostConfig: {
                        //  When networking mode is a name of another network it's
                        //  automatically attached.
                        NetworkMode: engineNetworkName,
                        Binds: [
                            //  HACK: We hard-code the stack volume mount path to /lazy which is
                            //  known to all containers.
                            process.env.LAZY_STACK_VOLUME_NAME + ':/lazy'
                        ],
                        RestartPolicy: {
                            Name: 'unless-stopped'
                        }
                    },
                    //  HACK: We hard-code the stack volume mount path to /lazy which is known to
                    //  all containers.
                    WorkingDir: '/lazy'
                };

                return HigherDockerManager.createContainer(createHelperParams);
            })
            .then((container) => {
                return container.start();
            });
    }
}

module.exports = EngineHelperContainerCreator;
