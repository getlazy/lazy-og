
'use strict';

/* global logger */

const LazyYamlFile = require('./app/lazy-yaml-file');
const Main = require('./app/main.js');
const Logger = require('./app/logger');

const safeLog = (level, message) => {
    if (global.logger) {
        global.logger.log(level, message);
    } else {
        // lazy ignore no-console ; we don't have a logger so nowhere else to log
        console.log(message);
    }
};

// Setup graceful termination on SIGINT.
process.on('SIGINT', () => {
    safeLog('info', 'Received SIGINT, stopping lazy.');
    Main.stop()
        .then(() => {
            safeLog('info', 'lazy stopped.');
            process.exit(0);
        })
        .catch((err) => {
            safeLog('error', 'Error occurred during stopping', { err });
            process.exit(-1);
        });
});

// We always try to load /config/lazy.yaml. Since lazy runs in a docker container the only way to
// "pass" it is by either building on top of its image or mounting a local directory as /config
LazyYamlFile.load('/config/lazy.yaml')
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
            process.exit(-1);
        })
    );
