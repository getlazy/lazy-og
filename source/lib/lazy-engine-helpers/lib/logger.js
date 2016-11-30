
'use strict';

const _ = require('lodash');
const winston = require('winston');

let logger;

const getEngineLogger = () => {
    if (!_.isUndefined(logger)) {
        return logger;
    }

    logger = new(winston.Logger)({
        transports: [
            new (winston.transports.Console)({
                formatter: (options) => {
                    return options.level.toUpperCase() + ' ' +
                        (options.message ? options.message : '') +
                        (options.meta && Object.keys(options.meta).length ?
                            '\n\t'+ JSON.stringify(options.meta) : '');
                }
            })
        ]
    });

    return logger;
};

module.exports = {
    getEngineLogger: getEngineLogger
};
