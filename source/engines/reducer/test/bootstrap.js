
'use strict';

// In engine processes it is strongly recommended to include engine-helpers as the first thing
// in the process's lifetime and then immediately invoke `initialize` which will setup global logger,
// default handlers for uncaught exceptions, unhandled promises and so on.
require('@lazyass/engine-helpers').initialize();

const Engine = require('../reducer-engine');

const engine = new Engine();

// lazy ignore arrow-body-style
module.exports = {
    start: () => {
        return engine.start();
    },
    stop: () => {
        return engine.stop();
    }
};
