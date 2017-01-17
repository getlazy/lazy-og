
'use strict';

const _ = require('lodash');
const winston = require('winston');

let logger;

const getEngineLogger = () => {
    if (!_.isUndefined(logger)) {
        return logger;
    }

    logger = new winston.Logger({
        transports: [
            // We leave it to lazy to parse our logs and correctly redirect them.
            new winston.transports.Console({
                formatter: JSON.stringify
            })
        ]
    });

    return logger;
};

module.exports = {
    getEngineLogger: getEngineLogger
};
