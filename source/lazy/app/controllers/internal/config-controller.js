
'use strict';

/* global logger */

const _ = require('lodash');

const initialize = (app, options) => {
    //  TODO: See https://github.com/SoftwareMarbles/lazy/issues/44 for proposal to change
    //  this endpoint.
    app.get('/config', (req, res) => {
        const engineName = _.toLower(_.get(req, 'query.engine'));
        const engineConfig = _.get(options, `config.engines.${engineName}`);

        if (_.isNil(engineConfig)) {
            res.sendStatus(404);
            return;
        }

        res.send(engineConfig);
    });

    return Promise.resolve();
}

module.exports = {
    initialize
};
