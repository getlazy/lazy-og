
'use strict';

const _ = require('lodash');
const winston = require('winston');
const WinstonElasticsearch = require('winston-elasticsearch');
const fp = require('lodash/fp');

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
            level: 'info'
        };
    }

    if (consoleConfig) {
        transports.push(new winston.transports.Console({
            timestamp: () => new Date(),
            level: consoleConfig.level,
            formatter: (options) => {
                const message = options.message ? options.message : '';
                const meta = (options.meta && !_.isEmpty(options.meta)) ?
                    JSON.stringify(options.meta) : '';
                return `${options.timestamp().toISOString()} ${options.level.toUpperCase()} ${message} ${meta}`;
            }
        }));
    }

    const logger = new winston.Logger({
        transports,
        rewriters: [
            (level, message, meta) => fp.extend(meta, { lazy_version: LAZY_VERSION })
        ]
    });

    return Promise.resolve(logger);
};

module.exports = {
    initialize
};
