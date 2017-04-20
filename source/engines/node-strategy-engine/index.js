
'use strict';

/* global logger */

// In engine processes it is strongly recommended to include engine-helpers as the first thing
// in the process's lifetime and then immediately invoke `initialize` which will setup global logger,
// default handlers for uncaught exceptions, unhandled promises and so on.
const EngineHelpers = require('@getlazy/engine-helpers');

EngineHelpers.initialize();

const _ = require('lodash');
const fs = require('fs');
const EngineContainer = require('./lib/engine-container');
const LocalEngineStrategyProxy = require('./lib/local-engine-strategy-proxy');

const LazyPrivateApiClient = EngineHelpers.LazyPrivateApiClient;

let engine;

const client = new LazyPrivateApiClient();
client.getEngineConfig()
    .then((fullEngineConfig) => {
        const engineConfig = _.get(fullEngineConfig, 'config', {});

        // During hacking we mount a local strategy at /strategy of engine's container.
        if (fs.existsSync('/strategy')) {
            engine = new LocalEngineStrategyProxy(engineConfig, '/strategy');
        } else {
            engine = new EngineContainer(engineConfig);
        }

        // We purposefully log starting/started messages from the engine as that allows us to keep track
        // of restarts directly in the console during development (it would be terribly hacky to say
        // monitor for [nodemon], which we use to restart, and output those from lazy)
        logger.info('Starting engine.');
        engine.start()
            .then(() => {
                logger.info('Engine started.');
            })
            .catch((err) => {
                logger.error('Failed to start engine', err);
                process.exit(-1);
            });
    })
    .catch((err) => {
        logger.error('Error starting engine.', err);
        process.exit(-1);
    });

//  Setup graceful termination on SIGTERM.
process.on('SIGTERM', () => {
    logger.info('Received SIGTERM, stopping engine.');
    try {
        engine.stop()
            .then(() => {
                logger.info('Engine stopped.');
                process.exit(0);
            })
            .catch((err) => {
                logger.error('Error occurred during stopping', err);
                process.exit(-1);
            });
    } catch (error) {
        logger.error('Error occurred during stopping engine.', error);
        process.exit(-1);
    }
});
