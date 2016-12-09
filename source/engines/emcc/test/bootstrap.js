
'use strict';

const EmccEngine = require('../emcc-engine');
const emccEngine = new EmccEngine();

module.exports = {
    start: () => {
        return emccEngine.start();
    },
    stop: () => {
        return emccEngine.stop();
    }
};
