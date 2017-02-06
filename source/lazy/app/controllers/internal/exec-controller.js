
'use strict';

/* global logger */

const _ = require('lodash');

let engineManager;

const errorResponse = (res, err) => {
    res.status((err && err.statusCode) || 500).send({
        err: err && err.message
    });
};

const initialize = (app, options) => {
    engineManager = options.engineManager;

    app.post('/exec-in-engine-helper-container', (req, res) => {
        const engineId = _.get(req, 'body.engineId');
        const helperId = _.get(req, 'body.helperId');
        const execParams = _.get(req, 'body.execParams');

        if (_.isEmpty(engineId) || _.isEmpty(helperId) || _.isEmpty(execParams)) {
            logger.error('Bad exec-in-engine-helper-container request', { params: { engineId, helperId, execParams } });
            res.status(400).send();
            return;
        }

        engineManager.execInEngineHelperContainer(engineId, helperId, execParams)
            .then(output => res.send(output))
            .catch(_.curry(errorResponse)(res));
    });

    return Promise.resolve();
};

module.exports = {
    initialize
};
