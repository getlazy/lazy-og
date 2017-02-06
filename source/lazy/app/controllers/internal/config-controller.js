
'use strict';

/* global logger */

const _ = require('lodash');

const initialize = (app, options) => {
    //  TODO: See https://github.com/getlazy/lazy/issues/44 for proposal to change
    //  this endpoint.
    app.get('/config', (req, res) => {
        const engineId = _.toLower(_.get(req, 'query.engineId'));
        const engineConfig = _.get(options, `config.engines.${engineId}`);

        if (_.isNil(engineConfig)) {
            res.sendStatus(404);
            return;
        }

        res.send(engineConfig);
    });

    return Promise.resolve();
};

module.exports = {
    initialize
};
