
'use strict';

const Engine = require('./php-l-engine');
const engine = new Engine();

engine.start()
    .then(() => {
        logger.info('engine started');
    })
    .catch((err) => {
        logger.error('Failed to start', err);
        process.exit(-1);
    });
