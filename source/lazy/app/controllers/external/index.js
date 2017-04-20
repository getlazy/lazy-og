
'use strict';

// lazy ignore-once arrow-body-style
const initialize = (app, options) => {
    // lazy ignore-once global-require
    return require('./engine-controller').initialize(app, options);
};

module.exports = {
    initialize
};
