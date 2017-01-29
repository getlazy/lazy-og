
'use strict';

/* global logger */

const _ = require('lodash');
const HelperContainerManager = require('../../helper-container-manager');

const errorResponse = (res, err) => {
    res.status((err && err.statusCode) || 500).send({
        err: err && err.message
    });
};

const initialize = (app, options) => {
    app.post('/helper-container/create', (req, res) => {
        const auth = _.get(req, 'body.auth');
        const imageName = _.get(req, 'body.imageName');
        const lazyVolumeName = _.get(req, 'body.lazyVolumeName');

        HelperContainerManager.createContainer(auth, imageName, lazyVolumeName)
            .then(containerId => res.send({ containerId }))
            .catch(_.curry(errorResponse)(res));
    });

    app.post('/helper-container/delete', (req, res) => {
        const containerId = _.get(req, 'body.containerId');

        HelperContainerManager.deleteContainer(containerId)
            .then(deletedContainerId => res.send({ containerId: deletedContainerId }))
            .catch(_.curry(errorResponse)(res));
    });

    app.post('/helper-container/exec', (req, res) => {
        const containerId = _.get(req, 'body.containerId');
        const execParams = _.get(req, 'body.execParams');

        HelperContainerManager.execInContainer(containerId, execParams)
            .then(output => res.send(output))
            .catch(_.curry(errorResponse)(res));
    });

    return Promise.resolve();
};

module.exports = {
    initialize
};
