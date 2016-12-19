
'use strict';

const initialize = (app, options) => {
    return require('./engine-controller').initialize(app, options)
};

module.exports = {
    initialize: initialize
};
