
'use strict';

// Setup uncaught exception handling first thing in the process.
const safeLog = (level, message, meta, callback) => {
    if (global.logger) {
        global.logger.log(level, message, meta, callback);
    } else {
        // lazy ignore no-console ; we don't have a logger so nowhere else to log
        console.log(JSON.stringify({ level, message, meta }));
    }
};

process.on('uncaughtException', (err) => {
    safeLog('error', 'Uncaught exception', { err }, () => {
        process.exit(-1001);
    });
});

process.on('unhandledRejection', (reason, promise) => {
    if (_.isObject(reason)) {
        throw reason;
    }

    throw new Error(`Unhandled promise rejection: ${reason}`);
});

// lazy ignore global-require
module.exports = {
    AdaptedAtomLinter: require('./lib/adapted-atom-linter'),
    Logger: require('./lib/logger'),
    HelperContainer: require('./lib/helper-container'),
    EngineHttpServer: require('./lib/engine-http-server'),
    LazyPrivateApiClient: require('./lib/lazy-private-api-client')
};
