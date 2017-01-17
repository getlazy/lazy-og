
'use strict';

const _ = require('lodash');
const winston = require('winston');
const winstonLogstashUdp = require('winston-logstash-udp');
const winstonElasticsearch = require('winston-elasticsearch');

const LAZY_VERSION = require('../package.json').version;

const initialize = (lazyConfig) => {
    const transports = [];

    const elasticConfig = _.get(lazyConfig, 'config.logger.elastic');
    if (elasticConfig) {
        transports.push(new winstonElasticsearch(elasticConfig));
    }

    const logstashUdpConfig = _.get(lazyConfig, 'config.logger.logstash-udp');
    if (logstashUdpConfig) {
        transports.push(new winstonLogstashUdp.LogstashUDP(logstashUdpConfig));
    }

    const consoleConfig = _.get(lazyConfig, 'config.logger.console');
    if (!consoleConfig && _.isEmpty(transports)) {
        consoleConfig = {
            level: 'info'
        };
    }

    if (consoleConfig) {
        transports.push(new winston.transports.Console({
            level: consoleConfig.level,
            formatter: (options) => {
                return '[' + LAZY_VERSION + '] ' +
                    options.level.toUpperCase() + ' ' + (options.message ? options.message : '') +
                    (options.meta && Object.keys(options.meta).length ?
                        '\n\t'+ JSON.stringify(options.meta) : '');
            }
        }));
    }

    const logger = new winston.Logger({
        transports
    });

    return Promise.resolve(logger);
};

module.exports = {
    initialize
};
