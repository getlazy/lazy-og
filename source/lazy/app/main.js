
'use strict';

//  Initialize all global variables.
global.logger = require('./logger');

const _ = require('lodash');
const H = require('higher');
const express = require('express');
const bodyParser = require('body-parser');
const async = require('async');
const selectn = require('selectn');

const EngineManager = require('./engine-manager');
const LazyYamlFile = require('./lazy-yaml-file');
const clients = require('./clients');

//  Express application object that will be initialized once everything
//  else has finished initializing.
let app = null;

//  Engine manager object managing all the engine containers.
let engineManager = null;

//  Maps to and from loaded engines.
const namesToEnginesMap = new Map();
const languagesToEnginesMap = new Map();
const allLanguagesEngines = [];

class Main
{
    /**
     * Starts the stack by first initializing engines and other services
     * and then starting Express HTTP server.
     * @return {Promise} Promise which is resolved when the application has started.
     */
    static main() {
        logger.info('Booting lazy-engines-stack');

        return Main._recreateAllEngines()
            .then(Main._populateLanguagesToEngines)
            .then(Main._initializeExpressApp);
    }

    static _initializeExpressApp() {
        return new Promise((resolve) => {
            app = express();
            app.use(bodyParser.json());

            app.get('/info', (req, res) => {
                res.send({
                    engines: _.keys(namesToEnginesMap),
                    languages: _.keys(languagesToEnginesMap)
                });
            });

            app.post('/file', (req, res) => {
                const start = new Date();

                let grammar = selectn('body.grammar', req);
                if (_.isEmpty(grammar)) {
                    return res.status(400).send();
                }

                const host = selectn('body.host', req);
                const path = selectn('body.path', req);
                const content = selectn('body.content', req);
                const clientName = selectn('body.client', req);

                //  Transform the language if a known client is specified.
                const client = clients.getClient(clientName);
                let language = grammar;
                if (client && _.isFunction(client.translateGrammarToLanguage)) {
                    const translatedLanguage = client.translateGrammarToLanguage(grammar);
                    if (_.isString(translatedLanguage)) {
                        language = translatedLanguage;
                    } else {
                        //  Nothing to do but try with the grammar as language.
                    }
                } else {
                    logger.warn('No client found for', clientName);
                    language = _.toLower(language);
                }

                try {
                    let allEnginesResults = {
                        warnings: []
                    };
                    let firstError = null;

                    //  Analyze the content in all the engines and merge all their warnings.
                    const enginesForLanguage = languagesToEnginesMap[language];
                    logger.info('Starting file analysis', {
                        language: language,
                        host: host,
                        path: path
                    });

                    async.each(enginesForLanguage, (engine, next) => {
                        engine.analyzeFile(content, path, language)
                            .then((engineResults) => {
                                allEnginesResults = _.extend(allEnginesResults, engineResults);
                                next();
                            })
                            .catch((err) => {
                                logger.error(
                                    'File analysis failed for', engine.name, 'engine', err);
                                if (_.isNull(firstError)) {
                                    //  Store the first error to report it no other engine works
                                    //  either.
                                    firstError = err;
                                }
                                //  Continue processing even if a particular engine failed.
                                next();
                            });
                    }, (err) => {
                        if (err) {
                            logger.err('File analysis failed', err);
                            return res.status(500).send({
                                error: err && err.message
                            });
                        }

                        if (_.isEmpty(allEnginesResults.warnings) && !_.isNull(firstError)) {
                            logger.info('File analysis failed', firstError);
                            return res.status(500).send({
                                error: firstError && firstError.message
                            });
                        }

                        if (_.isEmpty(enginesForLanguage)) {
                            logger.warn('No engines registered for', language);
                        }

                        const end = new Date();
                        logger.info('File analysis done', {
                            language: language,
                            warnings: selectn('warnings.length', allEnginesResults),
                            duration: (end - start),
                            host: host,
                            path: path
                        });

                        res.send(allEnginesResults);
                    });
                } catch (e) {
                    logger.error('Exception during file analysis', e);
                    res.status(500).send({error: e && e.message});
                }
            });

            const port = process.env.PORT || 80;
            app.listen(port, () => {
                logger.info('`lazy-stack` listening on', port);
                resolve();
            });

            app.on('error', (err) => {
                logger.error('Express error', err);
            });
        });
    }

    static _populateLanguagesToEngines(engines) {
        _.each(engines, (engine) => {
            namesToEnginesMap[_.toLower(engine.name)] = engine;

            //  If engine is for no languages then it will be applied to all languages.
            if (_.isEmpty(engine.languages)) {
                allLanguagesEngines.push(engine);
                return;
            }

            //  Remove all whitespaces around language names and set the languages to lower case
            const normalizedLanguages = _.map(engine.languages, (language) => {
                return _.toLower(_.trim(language));
            });

            let languageAssignedToAtLeastOneLanguage = false;
            _.each(normalizedLanguages, (language) => {
                if (!H.isNonEmptyString(language)) {
                    logger.warn('Bad language value', language);
                    return;
                }

                if (_.isUndefined(languagesToEnginesMap[language])) {
                    languagesToEnginesMap[language] = [];
                }

                languagesToEnginesMap[language].push(engine);
                languageAssignedToAtLeastOneLanguage = true;
            });

            if (!languageAssignedToAtLeastOneLanguage) {
                logger.warn('Engine', engine.name, 'has bad languages value',
                    engine.languages);
            }
        });

        //  Return the engines to continue their processing.
        return engines;
    }

    static _recreateAllEngines() {
        return LazyYamlFile.load(__dirname + '/../lazy.yaml')
            .then((lazyConfig) => {
                engineManager = new EngineManager(lazyConfig);
                return engineManager.start();
            });
    }
}

module.exports = Main;
