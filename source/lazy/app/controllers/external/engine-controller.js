'use strict';

/* global logger */
// lazy ignore arrow-body-style ; What's wrong with arrow body style, anyway?

const _ = require('lodash');
const selectn = require('selectn');
const proxy = require('http-proxy-middleware');
const PACKAGE_VERSION = require('../../../package.json').version;

//  Maps to and from loaded engines.
const namesToEnginesMap = new Map();

let enginePipeline = {};

const populateLanguagesToEnginesStructures = (engineManager) => {
    const engines = engineManager.engines;

    _.forEach(engines, (engine) => {
        namesToEnginesMap[_.toLower(engine.name)] = engine;
    });
};

const runSingleEngine = (engineName, hostPath, language, content, context) => {
    const engine = namesToEnginesMap[_.toLower(engineName)];
    const lowerLang = _.toLower(_.trim(language));

    if (_.isNil(engine)) {
        // Engine is present in pipeline,
        // but no definition exists.
        logger.warn(`Skipping engine "${engineName}"`);
        return Promise.resolve();
    }

    if ((_.isEmpty(engine.languages)) || (_.findIndex(engine.languages, (lang) => {
        return _.eq(_.toLower(_.trim(lang)), lowerLang);
    }) > -1)) {
        return engine.analyzeFile(hostPath, language, content, context).then((singleEngineResults) => {
            return Promise.resolve(singleEngineResults);
        }).catch((err) => {
            logger.error(
                'File analysis failed', {
                    engine: engineName,
                    err
                });
        });
    }

    return Promise.resolve();
};

const getSingleEngine = (engineDef) => {
    const engineName = _.head(_.keys(engineDef));

    if (_.includes(['bundle', 'sequence'], engineName)) {
        return null;
    }
    return {
        engineName,
        engineParams: _.get(engineDef, engineName, {})
    };
};

const runEnginePipeline = (pipeLine, hostPath, language, content, context, engineStatuses) => {
    const bundle = _.get(pipeLine, 'bundle');
    const seq = _.get(pipeLine, 'sequence');

    try {
        const newContext = _.cloneDeep(context);

        if (!_.isNil(bundle)) {
            // Process engines asynchronously
            return Promise.all(
                _.map(bundle, (value) => {
                    const singleEntry = getSingleEngine(value);

                    if (_.isNil(singleEntry)) {
                        return runEnginePipeline(value, hostPath, language, content, newContext, engineStatuses);
                    }
                    newContext.engineParams = singleEntry.engineParams;
                    return runSingleEngine(singleEntry.engineName, hostPath, language, content, newContext);
                })
            ).then((res) => {
                const results = _.compact(res);
                const bundleResults = _.reduce(results, (accum, oneResult) => {
                    const status = _.get(oneResult, 'status');
                    const warnings = _.get(oneResult, 'warnings');

                    // Since we are running engines in parallel,
                    // we need to collect and accumulate output of all engines.
                    if (!_.isNil(warnings)) {
                        accum.warnings = _.union(accum.warnings, warnings);
                    }

                    // Also, accumulate statuses of each engine
                    if (!_.isNil(status)) {
                        engineStatuses.push(status);
                    }
                    return accum;
                }, {
                    warnings: []
                });
                return Promise.resolve(bundleResults);
            });
        }

        if (!_.isNil(seq)) {
            // Process engines synchronously
            return _.reduce(seq, (engineRunner, value) => {
                return engineRunner.then((results) => {
                    // Pass the results of this step
                    // to the next engine in sequence via context param
                    const singleEntry = getSingleEngine(value);

                    newContext.previousStepResults = results;

                    // Since the engines are run in sequence,
                    // We do not accumulate their output - we should end up
                    // with results of last engine in sequence, only.
                    // However, we DO want to accumulate statuses of each engine
                    const status = _.get(results, 'status');
                    if (!_.isNil(status)) {
                        engineStatuses.push(status);
                    }
                    if (_.isNil(singleEntry)) {
                        return runEnginePipeline(value, hostPath, language, content, newContext, engineStatuses);
                    }
                    newContext.engineParams = singleEntry.engineParams;
                    return runSingleEngine(singleEntry.engineName, hostPath, language, content, newContext);
                });
            }, Promise.resolve());
        }
    } catch (err) {
        return Promise.reject(err);
    }
    return Promise.reject(new Error('Bad engine pipeline config.'));
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
            const statuses = [];
            return runEnginePipeline(enginePipeline, hostPath, language, content, context, statuses)
                .then((warnings) => {
                    // Did any engine reported that is has checked the code?
                    if (!_.find(statuses, { codeChecked: true })) {
                        warnings.warnings.push({
                            type: 'Info',
                            ruleId: ' lazy-no-linters-defined ',
                            message: `No engine registered for [${language}]. This file has not been checked for language-specific warnings.`,
                            filePath: hostPath
                        });
                        // Remove the info that all is fine, since we don't really know it
                        // if no engine checked the file. Delete rules ' lazy-no-linter-warnings '
                        _.remove(warnings.warnings, (warn) => {
                            return (_.eq(warn.ruleId, ' lazy-no-linter-warnings '));
                        });
                    }
                    return res.send(warnings);
                }).catch((err) => {
                    return res.status(500).send({
                        error: err && err.message
                    });
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
        const enginePath = `/engine/${engine.name}`;

        //  Proxy all calls from /engine/<engine.name> to the engine.
        //  Allow websockets upgrade.
        const proxyOptions = {
            target: engine.url,
            ws: true,
            pathRewrite: {}
        };
        proxyOptions.pathRewrite[`^${enginePath}`] = '';

        app.use(enginePath, proxy(enginePath, proxyOptions));
    });

    //  Proxy the rest of calls to / to UI engine if one has been configured.
    const uiEngine = _.get(options, 'engineManager.uiEngine');
    if (uiEngine) {
        //  Proxy all calls from / to the engine and allow websockets upgrade.
        app.use('/', proxy({
            target: uiEngine.url,
            ws: true
        }));
    }
};

const initialize = (app, options) => {
    populateLanguagesToEnginesStructures(options.engineManager);
    enginePipeline = _.get(options, 'config.engine_pipeline');
    addEndpoints(app, options);
    return Promise.resolve();
};

module.exports = {
    initialize
};
