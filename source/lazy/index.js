
'use strict';

const Main = require('./app/main.js');
Main.main()
    .then(() => {
        logger.info('`lazy-stack` initialized');
    })
    .catch((err) => {
        logger.error('Failed to initialize `lazy-stack`', err);
        process.exit(-1);
    });
