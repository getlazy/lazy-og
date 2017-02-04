
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

    app.post('/helper-container/exec', (req, res) => {
        const helperId = _.get(req, 'body.helperId');
        const execParams = _.get(req, 'body.execParams');

        engineManager.execInHelperContainer(helperId, execParams)
            .then(output => res.send(output))
            .catch(_.curry(errorResponse)(res));
    });

    return Promise.resolve();
};

module.exports = {
    initialize
};
