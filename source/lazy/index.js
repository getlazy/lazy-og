
'use strict';

/* global logger */

const Main = require('./app/main.js');

//  We always try to load /config/lazy.yaml. Since lazy runs in a docker container the only way to
//  "pass" it is by either building on top of its image or mounting a local directory as /config
Main.main('/config/lazy.yaml')
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
