
'use strit';

const Main = require('../app/main');

let alreadyStarted = false;
const start = () => {
    if (alreadyStarted) {
        return Promise.resolve();
    }
    alreadyStarted = true;

    return Main.main()
        .then(() => {
            logger.info('`lazy-stack` initialized (TEST)');
        })
        .catch((err) => {
            logger.error('Failed to initialize `lazy-stack` (TEST)', err);
            process.exit(-1);
        });
};

module.exports = start;
