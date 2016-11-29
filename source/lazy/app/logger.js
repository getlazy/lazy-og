
'use strict';

const winston = require('winston');
const LogstashUDP = require('winston-logstash-udp').LogstashUDP;

const LAZY_STACK_VERSION = require('../package.json').version;

const logger = new(winston.Logger)({
    transports: [
        new (winston.transports.Console)({
            timestamp: () => {
                return new Date();
            },
            formatter: (options) => {
                return options.timestamp().toISOString() + ' [' + LAZY_STACK_VERSION + '] ' +
                    options.level.toUpperCase() + ' ' + (options.message ? options.message : '') +
                    (options.meta && Object.keys(options.meta).length ?
                        '\n\t'+ JSON.stringify(options.meta) : '');
            }
        }),
        new(LogstashUDP)({
            appName: 'lazy-stack',
            host: process.env.ELK_HOST,
            port: process.env.ELK_PORT
        })
    ]
});

module.exports = logger;
