
'use strict';

const EmccEngine = require('./emcc-engine');
const emccEngine = new EmccEngine();

emccEngine.start()
    .then(() => {
        logger.info('emcc engine started');
    })
    .catch((err) => {
        logger.error('Failed to start', err);
        process.exit(-1);
    });
