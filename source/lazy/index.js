
'use strict';

/* global logger */

const Main = require('./app/main.js');

Main.main()
    .then(() => {
        logger.info('lazy initialized');
    })
    .catch((err) => {
        logger.error('Failed to initialize lazy', err);
        process.exit(-1);
    });

//  Setup graceful termination on SIGINT.
process.on('SIGINT', () => {
    logger.info('Received SIGINT, stopping lazy.');
    Main.stop()
        .then(() => {
            logger.info('lazy stopped.');
            process.exit(0);
        })
        .catch((err) => {
            logger.error('Error occurred during stopping', err);
            process.exit(-1);
        });
});
