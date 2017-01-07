
'use strict';

const EngineHelpers = require('@lazyass/engine-helpers');
global.logger = EngineHelpers.Logger.getEngineLogger();

const Engine = require('../postprocessor-engine');
const engine = new Engine();

module.exports = {
    start: () => {
        return engine.start();
    },
    stop: () => {
        return engine.stop();
    }
};
