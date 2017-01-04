
'use strict';

const initialize = (app, options) => {
    return require('./config-controller').initialize(app, options);
};

module.exports = {
    initialize: initialize
};
