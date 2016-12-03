
'use strict';

//  Initialize all global variables.
global.logger = require('./logger');

const _ = require('lodash');
const express = require('express');
const bodyParser = require('body-parser');
const async = require('async');
const selectn = require('selectn');

const clients = require('./clients');

//  Express application object that will be initialized once everything
//  else has finished initializing.
let app = null;

//  Languages to engines map.
let engines;

class Main
{
    /**
     * Starts the stack by first initializing engines and other services
     * and then starting Express HTTP server.
     * @return {Promise} Promise which is resolved when the application has started.
     */
    static main() {
        logger.info('Booting lazy-engines-stack');

        return require('./engines').boot()
            .then((languagesToEnginesMap) => {
                engines = languagesToEnginesMap;
            })
            .then(Main._initializeExpressApp);
    }

    static _initializeExpressApp() {
        return new Promise((resolve) => {
            app = express();
            app.use(bodyParser.json());

            app.post('/file', (req, res) => {
                const start = new Date();

                let grammar = selectn('body.grammar', req);
                if (_.isEmpty(grammar)) {
                    return res.status(400).send();
                }

                const host = selectn('body.host', req);
                const path = selectn('body.path', req);
                const content = selectn('body.content', req);

                //  Transform the language if a known client is specified.
                const client = clients.getClient(selectn('body.client', req));
                let language = grammar;
                if (_.isObject(client) && _.isFunction(client.translateGrammarToLanguage)) {
                    const translatedLanguage = client.translateGrammarToLanguage(grammar);
                    if (_.isString(translatedLanguage)) {
                        language = translatedLanguage;
                    } else {
                        //  Nothing to do but try with the grammar as language.
                    }
                }

                try {
                    let allEnginesResults = {
                        warnings: []
                    };
                    let firstError = null;

                    //  Analyze the content in all the engines and merge all their warnings.
                    const enginesForLanguage = engines[language];
                    logger.info('Starting file analysis', {
                        language: language,
                        host: host,
                        path: path
                    });

                    async.each(engines[language], (engine, next) => {
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
}

module.exports = Main;
