
'use strict';

const _ = require('lodash');
const winston = require('winston');
const WinstonElasticsearch = require('winston-elasticsearch');
const fp = require('lodash/fp');
const common = require('@lazyass/common');

const LAZY_VERSION = require('../package.json').version;

const initialize = (lazyConfig) => {
    const transports = [];

    const elasticConfig = _.get(lazyConfig, 'config.logger.elastic');
    if (elasticConfig) {
        const elasticsearchTransport = new WinstonElasticsearch(elasticConfig);
        elasticsearchTransport.on('error', (err) => {
            // lazy ignore no-console ; where else can we log when logging is failing?
            console.error('***** Elasticsearch logger transport error', err);
        });
        transports.push(elasticsearchTransport);
    }

    let consoleConfig = _.get(lazyConfig, 'config.logger.console');
    if (!consoleConfig && _.isEmpty(transports)) {
        consoleConfig = {
            level: 'metric'
        };
    }

    if (consoleConfig) {
        transports.push(new winston.transports.Console({
            timestamp: () => new Date().toISOString(),
            level: consoleConfig.level,
            colorize: true
        }));
    }

    winston.addColors(common.LazyLoggingLevels.colors);

    const logger = new winston.Logger({
        transports,
        rewriters: [
            (level, message, meta) => fp.extend(meta, { lazy_version: LAZY_VERSION })
        ],
        levels: common.LazyLoggingLevels.levels
    });
    logger.on('error', (err) => {
        console.log('Logging error', err);
    });

    return Promise.resolve(logger);
};

module.exports = {
    initialize
};
