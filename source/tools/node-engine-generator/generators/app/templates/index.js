
'use strict';

/* global logger */

const EngineHelpers = require('@getlazy/engine-helpers');

global.logger = EngineHelpers.Logger.getEngineLogger();

const Engine = require('./engine');

const engine = new Engine();

// We purposefully log starting/started messages from the engine as that allows us to keep track
// of restarts directly in the console during development (it would be terribly hacky to say
// monitor for [nodemon], which we use to restart, and output those from lazy)
logger.info('Starting engine.');
engine.start()
    .then(() => {
        logger.info('Engine started.');
    })
    .catch((err) => {
        logger.error('Failed to start', err);
        process.exit(-1);
    });

//  Setup graceful termination on SIGTERM.
process.on('SIGTERM', () => {
    logger.info('Received SIGTERM, stopping engine.');
    engine.stop()
        .then(() => {
            logger.info('Engine stopped.');
            process.exit(0);
        })
        .catch((err) => {
            logger.error('Error occurred during stopping', err);
            process.exit(-1);
        });
});
