
'use strict';

/* global logger */

const Logger = require('./app/logger');
// Until we load configuration we cannot configure our logger so we use default logger in the meantime.
global.logger = Logger.createTemporaryLogger();

const _ = require('lodash');
const LazyConfigFile = require('@lazyass/lazy-config-file');
const Main = require('./app/main.js');

// Setup graceful termination on SIGINT.
process.on('SIGINT', () => {
    logger.warn('Received SIGINT, stopping lazy.');
    Main.stop()
        .then(() => {
            logger.info('lazy stopped.');
            process.exit(0);
        })
        .catch((err) => {
            logger.error('Error occurred during stopping', { err: err && err.toString() });
            process.exit(-1);
        });
});

const redirectPackageLogEvent = (level, packageName, ...args) => {
    // In this example we put the package name into meta, if such exists.
    const argsWithoutMeta = [...args];
    const meta = argsWithoutMeta.pop();
    if (typeof(meta) === 'object') { // Nah, not really, use lodash!
        if (!meta._packageName) {
            meta._packageName = packageName;
        }
    }
    logger.log(level, argsWithoutMeta, meta);
};

const redirectPackagesLogEvents = (packageNames) => {
    _.forEach(packageNames, packageName => {
        require(packageName).logger.on('log', redirectPackageLogEvent);
    });
};

// Our 3rd agument is path to lazy.yaml (1st is node, 2nd is index.js)
const lazyYamlPath = process.argv[2];
LazyConfigFile.load(lazyYamlPath)
    .then(lazyConfig => Logger.initialize(lazyConfig)
        .then((logger) => {
            // Initialize the global logger.
            global.logger = logger;

            // Capture log events from packages emitting log events.
            redirectPackagesLogEvents(['@lazyass/engine-pipeline',
                '@lazyass/lazy-config-file']);

            return Main.main(lazyConfig);
        })
        .then(() => {
            logger.info('lazy initialized');
        })
        .catch((err) => {
            logger.error('Failed to initialize lazy', { err: err && err.toString() });
            process.exit(-2);
        })
    )
    .catch((err) => {
        logger.error('Failed to load config', err);
        process.exit(-3);
    });
