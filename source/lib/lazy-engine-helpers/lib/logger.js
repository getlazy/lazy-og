
'use strict';

const _ = require('lodash');
const winston = require('winston');
const common = require('@lazyass/common');

let logger;

const getEngineLogger = () => {
    // istanbul ignore if
    if (!_.isUndefined(logger)) {
        return logger;
    }

    // We use only console as lazy will be tracking engine's container logs.
    // This is also why we don't use colorization - we should never observe engine's
    // logs directly.
    logger = new winston.Logger({
        transports: [
            // Send logs as JSON and leave it to lazy to parse our logs and correctly redirect them.
            new winston.transports.Console({
                formatter: JSON.stringify,
                level: 'metric'
            })
        ],
        // Use custom levels.
        levels: common.LazyLoggingLevels.levels
    });

    return logger;
};

module.exports = {
    getEngineLogger
};
