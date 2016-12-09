
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

//  Setup graceful termination on SIGTERM.
process.on('SIGTERM', () => {
    logger.info('Received SIGTERM, stopping lazy.');
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
