
'use strict';

const ConfigController = require('./config-controller');
const ExecController = require('./exec-controller');

const initialize = (app, options) =>
    ConfigController.initialize(app, options)
        .then(() => ExecController.initialize(app, options));

module.exports = {
    initialize
};
