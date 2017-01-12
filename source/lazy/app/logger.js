
'use strict';

const winston = require('winston');

const LAZY_VERSION = require('../package.json').version;

const logger = new winston.Logger({
    transports: [
        new (winston.transports.Console)({
            formatter: (options) => {
                return '[' + LAZY_VERSION + '] ' +
                    options.level.toUpperCase() + ' ' + (options.message ? options.message : '') +
                    (options.meta && Object.keys(options.meta).length ?
                        '\n\t'+ JSON.stringify(options.meta) : '');
            }
        })
    ]
});

module.exports = logger;
