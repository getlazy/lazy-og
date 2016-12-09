
'use strict';

const winston = require('winston');

const STACK_VERSION = require('../package.json').version;

const logger = new(winston.Logger)({
    transports: [
        new (winston.transports.Console)({
            formatter: (options) => {
                return '[' + STACK_VERSION + '] ' +
                    options.level.toUpperCase() + ' ' + (options.message ? options.message : '') +
                    (options.meta && Object.keys(options.meta).length ?
                        '\n\t'+ JSON.stringify(options.meta) : '');
            }
        })
    ]
});

module.exports = logger;
