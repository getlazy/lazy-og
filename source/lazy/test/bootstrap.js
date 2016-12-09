
'use strit';

const Main = require('../app/main');

let alreadyStarted = false;
const start = () => {
    if (alreadyStarted) {
        return Promise.resolve();
    }
    alreadyStarted = true;

    return Main.main(__dirname + '/lazy-test.yaml')
        .then(() => {
            logger.info('`lazy-stack` initialized (TEST)');
        })
        .catch((err) => {
            logger.error('Failed to initialize `lazy-stack` (TEST)', err);
            process.exit(-1);
        });
};

const stop = () => {
    return Main.stop();
};

module.exports = {
    start: start,
    stop: stop
};
