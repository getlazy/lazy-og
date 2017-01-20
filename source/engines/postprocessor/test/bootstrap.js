
'use strict';

// Default logger in engine helpers outputs JSON, so we need 
// a more readable one
const winston = require('winston');
const common = require('@lazyass/common');

const createTemporaryLogger = () => {
    winston.addColors(common.LazyLoggingLevels.colors);

    const logger = new winston.Logger({
        transports: [new winston.transports.Console({
            level: 'info',
            colorize: true,
            prettyPrint: true
        })],
        levels: common.LazyLoggingLevels.levels
    });
    logger.on('error', (err) => {
        console.log('Logging error', err);
    });

    return logger;
};

global.logger = createTemporaryLogger();
