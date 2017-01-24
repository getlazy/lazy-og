
'use strict';

/* global logger */

const Logger = require('./app/logger');
// Until we load configuration we cannot configure our logger so we use default logger in the meantime.
global.logger = Logger.createTemporaryLogger();

const LazyYamlFile = require('./app/lazy-yaml-file');
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
            logger.error('Error occurred during stopping', { err });
            process.exit(-1);
        });
});

// Our 3rd agument is path to lazy.yaml (1st is node, 2nd is index.js)
const lazyYamlPath = process.argv[2];
LazyYamlFile.load(lazyYamlPath)
    .then(lazyConfig => Logger.initialize(lazyConfig)
        .then((logger) => {
            // Initialize the global logger.
            global.logger = logger;

            return Main.main(lazyConfig);
        })
        .then(() => {
            logger.info('lazy initialized');
        })
        .catch((err) => {
            logger.error('Failed to initialize lazy', { err });
            process.exit(-2);
        })
    )
    .catch((err) => {
        logger.error('Failed to load config', err);
        process.exit(-3);
    });
