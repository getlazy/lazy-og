
'use strict';

/* global logger */

// In engine processes it is strongly recommended to include engine-helpers as the first thing
// in the process's lifetime and then immediately invoke `initialize` which will setup global logger,
// default handlers for uncaught exceptions, unhandled promises and so on.
require('@getlazy/engine-helpers').initialize();

const Engine = require('./yaml-engine');

const engine = new Engine();

engine.start()
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
