
'use strict';

const _ = require('lodash');
const H = require('higher');
const selectn = require('selectn');
const url = require('url');
const async = require('async');
const proxy = require('express-http-proxy');

//  Maps to and from loaded engines.
const namesToEnginesMap = new Map();
const languagesToEnginesMap = new Map();
const allLanguagesEngines = [];

const populateLanguagesToEnginesStructures = (engineManager) => {
    const engines = engineManager.engines;

    _.each(engines, (engine) => {
        namesToEnginesMap[_.toLower(engine.name)] = engine;

        //  If engine is for no languages then it will be applied to all languages.
        if (_.isEmpty(engine.languages)) {
            allLanguagesEngines.push(engine);
            return;
        }

        //  Remove all whitespaces around language names and set the languages to lower case
        //  as the later language search is case-insensitive.
        const languageKeys = _.map(engine.languages, (language) => {
            return _.toLower(_.trim(language));
        });

        let languageAssignedToAtLeastOneLanguage = false;
        _.each(languageKeys, (languageKey) => {
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
}

const addEndpoints = (app, options) => {
    return new Promise((resolve) => {
        app.get('/version', (req, res) => {
            res.send({
                service: require('../../package.json').version,
                api: 'v20161217'
            });
        });

        app.get('/info', (req, res) => {
            res.send({
                engines: _.keys(namesToEnginesMap),
                languages: _.keys(languagesToEnginesMap)
            });
        });

        app.post('/file', (req, res) => {
            let language = selectn('body.language', req);
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

                //  Analyze the content in all the engines and merge all their warnings.
                const enginesForLanguage = _.union(languagesToEnginesMap[languageKey],
                    allLanguagesEngines);

                async.each(enginesForLanguage, (engine, next) => {
                    engine.analyzeFile(hostPath, language, content, context)
                        .then((engineResults) => {
                            allEnginesResults = _.extend(allEnginesResults, engineResults);
                            next();
                        })
                        .catch((err) => {
                            logger.error(
                                'File analysis failed', {
                                    engine: engine.name,
                                    err: err
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

                    if (_.isEmpty(enginesForLanguage)) {
                        logger.warn('No engines registered', {language: language});
                    }

                    res.send(allEnginesResults);
                });
            } catch (e) {
                logger.error('Exception during file analysis', e);
                res.status(500).send({error: e && e.message});
            }
        });

        //  Create proxies to pass all requests that get to /engine/{engine.name}/* paths.
        _.each(namesToEnginesMap, (engine) => {
            app.use('/engine/' + engine.name, proxy(engine.url, {
                forwardPath: (req, res) => {
                    //  Extract the requested engine URL path.
                    const originalUrl = url.parse(req.originalUrl);
                    const engineUrlPath = originalUrl && originalUrl.path &&
                        originalUrl.path.slice(('/engine/' + engine.name).length);

                    return engineUrlPath;
                }
            }));
        });

        //  Proxy GET /dashboard if one has been configured.
        const dashboard = _.get(options, 'engineManager.dashboard');
        if (dashboard) {
            app.get('/dashboard', proxy(dashboard.url));
        }
    });
};

const initialize = (app, options) => {
    populateLanguagesToEnginesStructures(options.engineManager);
    addEndpoints(app, options);
    return Promise.resolve();
}

module.exports = {
    initialize: initialize
};
