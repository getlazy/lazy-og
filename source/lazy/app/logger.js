
'use strict';

const _ = require('lodash');
const winston = require('winston');
const WinstonElasticsearch = require('winston-elasticsearch');
const fp = require('lodash/fp');

const LAZY_VERSION = require('../package.json').version;

// Based on npm logging levels but with more space to add additional future logging levels
// like "metric".
const LazyLoggingLevels = {
    levels: {
        error: 0,
        warn: 10,
        info: 20,
        // `metric` is a special logging level which we use to log all our explicit metrics.
        metric: 25,
        verbose: 30,
        debug: 40,
        silly: 50
    },
    colors:
    {
        error: 'red',
        warn: 'yellow',
        info: 'green',
        metric: 'grey',
        verbose: 'cyan',
        debug: 'blue',
        silly: 'magenta'
    }
};

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

    winston.addColors(LazyLoggingLevels.colors);

    const logger = new winston.Logger({
        transports,
        rewriters: [
            (level, message, meta) => fp.extend(meta, { lazy_version: LAZY_VERSION })
        ],
        levels: LazyLoggingLevels.levels
    });
    logger.on('error', (err) => {
        console.log('Logging error', err);
    });

    return Promise.resolve(logger);
};

module.exports = {
    initialize
};
