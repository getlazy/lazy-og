
'use strict';

/* global logger */

const _ = require('lodash');
const H = require('higher');
const selectn = require('selectn');
const async = require('async');
const proxy = require('express-http-proxy');
const PACKAGE_VERSION = require('../../package.json').version;

//  Maps to and from loaded engines.
const namesToEnginesMap = new Map();
const languagesToEnginesMap = new Map();
const allLanguagesEngines = [];

const populateLanguagesToEnginesStructures = (engineManager) => {
    const engines = engineManager.engines;

    _.forEach(engines, (engine) => {
        namesToEnginesMap[_.toLower(engine.name)] = engine;

        //  If engine is for no languages then it will be applied to all languages.
        if (_.isEmpty(engine.languages)) {
            allLanguagesEngines.push(engine);
            return;
        }

        //  Remove all whitespaces around language names and set the languages to lower case
        //  as the later language search is case-insensitive.
        const languageKeys = _.map(engine.languages, language => _.toLower(_.trim(language)));

        let languageAssignedToAtLeastOneLanguage = false;
        _.forEach(languageKeys, (languageKey) => {
            if (!H.isNonEmptyString(languageKey)) {
                logger.warn('Bad language value', languageKey);
                return;
            }

            if (_.isUndefined(languagesToEnginesMap[languageKey])) {
                languagesToEnginesMap[languageKey] = [];
            }

            languagesToEnginesMap[languageKey].push(engine);
            languageAssignedToAtLeastOneLanguage = true;
        });

        if (!languageAssignedToAtLeastOneLanguage) {
            logger.warn('Engine', engine.name, 'has bad languages value',
                engine.languages);
        }
    });
};

const addEndpoints = (app, options) => {
    app.get('/version', (req, res) => {
        res.send({
            service: PACKAGE_VERSION,
            api: 'v20161217'
        });
    });

    app.get('/engines', (req, res) => {
        res.send(_.reduce(namesToEnginesMap, (engines, engine, name) => {
            /* eslint no-param-reassign: off */
            engines[name] = {
                url: engine.url,
                meta: engine.meta
            };
            return engines;
        }, {}));
    });

    app.post('/file', (req, res) => {
        const language = selectn('body.language', req);
        if (_.isEmpty(language)) {
            return res.status(400).send();
        }

        const hostPath = selectn('body.hostPath', req);
        const content = selectn('body.content', req);
        const context = selectn('body.context', req);

        try {
            let allEnginesResults = {
                warnings: []
            };
            let firstError = null;

            //  Key is lower case because the search is case-insensitive.
            const languageKey = _.toLower(language);

            const enginesForLanguage = languagesToEnginesMap[languageKey];

            //  Analyze the content in all the corresponding engines and merge all their warnings.
            return async.each(_.union(enginesForLanguage, allLanguagesEngines), (engine, next) => {
                engine.analyzeFile(hostPath, language, content, context)
                    .then((engineResults) => {
                        allEnginesResults = _.assignIn(allEnginesResults, engineResults);
                        next();
                    })
                    .catch((err) => {
                        logger.error(
                            'File analysis failed', {
                                engine: engine.name,
                                err
                            });
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
                    return res.status(500).send({
                        error: err && err.message
                    });
                }

                if (_.isEmpty(allEnginesResults.warnings) && !_.isNull(firstError)) {
                    return res.status(500).send({
                        error: firstError && firstError.message
                    });
                }

                //  Set the flag for no-registered-language-engines so that clients can
                //  display something to the user indicating that no actual language-specific
                //  analysis was performed.
                if (_.isEmpty(enginesForLanguage)) {
                    allEnginesResults.noRegisteredLanguageEngines = true;
                }

                return res.send(allEnginesResults);
            });
        } catch (e) {
            logger.error('Exception during file analysis', e);
            return res.status(500).send({
                error: e && e.message
            });
        }
    });

    //  Create proxies to pass all requests that get to /engine/{engine.name}/* paths.
    _.forEach(namesToEnginesMap, (engine) => {
        app.use(`/engine/${engine.name}`, proxy(engine.url));
    });

    //  Proxy /dashboard to dashboard engine if one has been configured.
    const dashboard = _.get(options, 'engineManager.dashboard');
    if (dashboard) {
        app.use('/dashboard', proxy(dashboard.url));
    }
};

const initialize = (app, options) => {
    populateLanguagesToEnginesStructures(options.engineManager);
    addEndpoints(app, options);
    return Promise.resolve();
};

module.exports = {
    initialize
};
