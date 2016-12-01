
'use strict';

const winston = require('winston');

const STACK_VERSION = require('../package.json').version;

//  TODO: Detect when stack container is being run by lazy or on its own and based
//      on that change the output (e.g. timestamp needed running on its own)
//  TODO: Detect when stack container is being run by lazy and instead of logging to console
//      send the output to lazy. The same mechanism should be used with engines while other
//      containers created and run by the engines should have their standard out/err output
//      captured (like we do now for lazy-engines-stack)

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
