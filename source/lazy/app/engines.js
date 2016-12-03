
'use strict';

const _ = require('lodash');
const async = require('async');

const DockerizedHttpEngine = require('./dockerized-http-engine');

/**
 * Offers methods for loading and configuring engines.
 */
class Engines {
    /**
     * Boots all the engines and creates languages to engines map.
     * @return {Object} Languages to engines map.
     */
    static boot() {
        const engines = Engines._loadHttpEngines();

        return new Promise((resolve, reject) => {
            const languagesToEnginesMap = new Map();

            //  Asynchronously load engines.
            async.each(engines, (engine, nextEngine) => {
                //  When the engine is loaded from an index file, assume that's the entry point.
                if (engine.index) {
                    engine = engine.index;
                }

                const engineName = engine.name;
                logger.info('Loading engine', engineName);

                //  Boot the engine and if successful map it to its supported languages.
                engine.boot()
                    .then(() => {
                        _.each(engine.languages, (language) => {
                            if (_.isUndefined(languagesToEnginesMap[language])) {
                                languagesToEnginesMap[language] = [engine];
                            } else {
                                languagesToEnginesMap[language].push(engine);
                            }
                        });

                        logger.info('Loaded engine', engineName);
                        nextEngine();
                    })
                    .catch((err) => {
                        logger.error('Failed to load engine', engineName, err);
                        nextEngine();
                    });
            }, (err) => {
                if (err) {
                    return reject(err);
                }

                resolve(languagesToEnginesMap);
            });
        });
    };

    static _loadHttpEngines() {
        const HTTP_ENGINES_METADATA = [{
            name: 'eslint',
            languages: ['JavaScript'],
            container: {
                image: 'ierceg/lazy-eslint-engine:latest'
            }
        }, {
            name: 'stylelint',
            languages: ['scss', 'less', 'sugarss'],
            container: {
                image: 'ierceg/lazy-stylelint-engine:latest'
            }
        }, {
            name: 'tidy-html',
            languages: ['HTML'],
            container: {
                image: 'ierceg/node-dev:6.9.1',
                command: 'nodemon -V -d 1 -L -w /app tidy-html-engine.js'.split(' '),
                volumes: [
                    '/Users/ierceg/repos/lazy/lazy-tidy-html-engine:/app'
                ],
                working_dir: '/app'
            }
        }];

        return _.map(HTTP_ENGINES_METADATA, (engineParams) => {
            return new DockerizedHttpEngine(engineParams);
        });
    }
}

module.exports = Engines;
