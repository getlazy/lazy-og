
'use strict';

const EngineHelpers = require('@getlazy/engine-helpers');
EngineHelpers.initialize();

const Engine = require('../yaml-engine');
const engine = new Engine();

module.exports = {
    start: () => {
        return engine.start();
    },
    stop: () => {
        return engine.stop();
    }
};
