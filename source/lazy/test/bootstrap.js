
'use strit';

/* global logger */

const Main = require('../app/main');
const path = require('path');

let alreadyStarted = false;
const start = () => {
    if (alreadyStarted) {
        return Promise.resolve();
    }
    alreadyStarted = true;

    return Main.main(path.join(__dirname, 'lazy-test.yaml'))
        .then(() => {
            logger.info('lazy initialized (TEST)');
        })
        .catch((err) => {
            logger.error('Failed to initialize lazy (TEST)', err);
            process.exit(-1);
        });
};

const stop = () => Main.stop();

module.exports = {
    start,
    stop
};
