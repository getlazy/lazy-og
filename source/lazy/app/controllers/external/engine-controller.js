'use strict';

/* global logger */
// lazy ignore lodash/chaining ; We actually love using chaining...
// lazy ignore arrow-body-style ; What's wrong with arrow body style, anyway?

const _ = require('lodash');
const selectn = require('selectn');
const proxy = require('http-proxy-middleware');
const PACKAGE_VERSION = require('../../../package.json').version;

//  Maps to and from loaded engines.
const namesToEnginesMap = new Map();

let enginePipeline = {};
let maxWarningsPerRule = null;
let maxWarningsPerFile = null;

const populateLanguagesToEnginesStructures = (engineManager) => {
    const engines = engineManager.engines;

    _.forEach(engines, (engine) => {
        namesToEnginesMap[_.toLower(engine.name)] = engine;
    });
};

const reduceWarnings = (allWarnings) => {
    const allEnginesResults = {
        warnings: []
    };
    //  Reduce the number of warnings per max warnings per rule and max warnings
    //  settings.
    const reducedWarnings = _(allWarnings.warnings)
        .groupBy('ruleId')
        .mapValues((warnings, ruleId) => {
            if (!_.isNumber(maxWarningsPerRule) ||
                warnings.length <= maxWarningsPerRule ||
                ruleId === 'undefined') {
                return warnings;
            }
            const firstWarning = _.head(_.sortBy(warnings, 'line'));

            //  Use the first warning plus an info on the same line with the number
            //  of warnings left for the same rule.
            return [firstWarning, _.assignIn(_.clone(firstWarning), {
                type: 'Info',
                message: `+ ${warnings.length - 1} other warnings of [${ruleId}] rule`
            })];
        })
        .flatMap()
        //  If max warnings per file is defined then limit the number of warnings.
        .take(_.isNumber(maxWarningsPerFile) ? maxWarningsPerFile : allEnginesResults.warnings.length)
        .value();
    allEnginesResults.warnings = reducedWarnings;
    return allEnginesResults;
};

const runSingleEngine = (engineName, hostPath, language, content, context) => {
    const engine = namesToEnginesMap[_.toLower(engineName)];
    const lowerLang = _.toLower(_.trim(language));

    if (_.isNil(engine)) {
        // Engine is present in pipeline,
        // but no definition exists.
        // Should this be reported? For now, just carry on...
        return Promise.resolve();
    }
  
    if ((_.isEmpty(engine.languages)) || (_.findIndex(engine.languages, (lang) => {
        return _.eq(_.toLower(_.trim(lang)), lowerLang);
    }) > -1)) {
        return engine.analyzeFile(hostPath, language, content, context).then((singleEngineResults) => {
            return Promise.resolve(reduceWarnings(singleEngineResults));
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

const runEnginePipeline = (pipeLine, hostPath, language, content, context) => {
    const batch = _.get(pipeLine, 'batch');
    const seq = _.get(pipeLine, 'sequence');

    try {
        if (!_.isNil(batch)) {
            // Process engines asynchronously
            return Promise.all(
                _.map(batch, (value) => {
                    const oneEngine = _.get(value, 'run');
                    if (!_.isNil(oneEngine)) {
                        return runSingleEngine(oneEngine, hostPath, language, content, context);
                    }
                    return runEnginePipeline(value, hostPath, language, content, context);
                })
            ).then((res) => {
                const results = _.compact(res);
                const batchResults = _.reduce(results, (accum, oneResult) => {
                    const warnings = _.get(oneResult, 'warnings');
                    if (!_.isNil(warnings)) {
                        accum.warnings = _.union(accum.warnings, warnings);
                    }
                    return accum;
                }, {
                    warnings: []
                });
                return Promise.resolve(batchResults);
            });
        }

        if (!_.isNil(seq)) {
            // Process engines synchronously
            return _.reduce(seq, (engineRunner, value) => {
                return engineRunner.then((results) => {
                    // Pass the results of this step
                    // to the next engine in sequence via context param
                    const newContext = _.cloneDeep(context);
                    const oneEngine = _.get(value, 'run');

                    newContext.previousStepResults = results;
                    if (!_.isNil(oneEngine)) {
                        return runSingleEngine(oneEngine, hostPath, language, content, newContext);
                    }
                    return runEnginePipeline(value, hostPath, language, content, newContext);
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
            return runEnginePipeline(enginePipeline, hostPath, language, content, context)
                .then((warnings) => {
                    // We don't want to summarize warnings at the end,
                    // as it may cause warnings from some engines to be
                    // pushed out by some other engine that generated lot of warnings.
                    // Instead, we will just limit the number of warning each engine
                    // can produce.
                    // return res.send(reduceWarnings(warnings));
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
    maxWarningsPerRule = _.get(options, 'config.config.max_warnings_per_rule', 4);
    maxWarningsPerFile = _.get(options, 'config.max_warnings_per_file');
    enginePipeline = _.get(options, 'config.engine_pipeline');
    addEndpoints(app, options);
    return Promise.resolve();
};

module.exports = {
    initialize
};
