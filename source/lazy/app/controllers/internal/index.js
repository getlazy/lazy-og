
'use strict';

const ConfigController = require('./config-controller');
const HelperContainerController = require('./helper-container-controller');

const initialize = (app, options) => {
    return ConfigController.initialize(app, options)
        .then(() => HelperContainerController.initialize(app, options));
};

module.exports = {
    initialize: initialize
};
