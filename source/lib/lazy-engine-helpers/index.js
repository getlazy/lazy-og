
'use strict';

const _ = require('lodash');

// Function that should be invoked first thing on engine boot.
const initialize = () => {
    // Set global logger.
    global.logger = require('./lib/logger').getEngineLogger();

    // Setup uncaught exception and unhandled promise rejection handling.
    process.on('uncaughtException', (err) => {
        global.logger.error('Uncaught exception', err, { err: err && err.toString() }, () => {
            process.exit(-1001);
        });
    });
    process.on('unhandledRejection', (reason) => {
        if (_.isObject(reason)) {
            throw reason;
        }

        throw new Error(`Unhandled promise rejection: ${reason}`);
    });

    return module.exports;
};

// lazy ignore global-require
module.exports = {
    initialize,
    AdaptedAtomLinter: require('./lib/adapted-atom-linter'),
    Logger: require('./lib/logger'),
    HelperContainer: require('./lib/helper-container'),
    EngineHttpServer: require('./lib/engine-http-server'),
    LazyPrivateApiClient: require('./lib/lazy-private-api-client')
};
