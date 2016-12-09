
'use strict';

const EngineHelpers = require('@lazyass/engine-helpers');
global.logger = EngineHelpers.Logger.getEngineLogger();

const Engine = require('./emcc-engine');
const engine = new Engine();

engine.start()
    .then(() => {
        logger.info('engine started');
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

setTimeout(() => {}, 100000);
