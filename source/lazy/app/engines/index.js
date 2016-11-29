
'use strict';

const _ = require('lodash');
const async = require('async');

const engines = require('require-all')(__dirname);
delete engines.index;

/**
 * Offers methods for loading and configuring engines.
 */
class Engines {
    /**
     * Boots all the engines and creates languages to engines map.
     * @return {Object} Languages to engines map.
     */
    static boot() {
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
                        nextEngine(err);
                    });
            }, (err) => {
                if (err) {
                    return reject(err);
                }

                resolve(languagesToEnginesMap);
            });
        });
    };
}

module.exports = Engines;
