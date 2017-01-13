
'use strict';

/* global logger */

const _ = require('lodash');

class EnginePipeline {
    constructor(engineManager, enginePipelineDefinition) {
        this._pipeLineDefinition = enginePipelineDefinition;
        this._populateLanguagesToEnginesStructures(engineManager);
    }

    _populateLanguagesToEnginesStructures(engineManager) {
        this._namesToEnginesMap = new Map();

        const engines = engineManager.engines;

        _.forEach(engines, (engine) => {
            this._namesToEnginesMap[_.toLower(engine.name)] = engine;
        });
    }

    _runSingleEngine(engineName, hostPath, language, content, context) {
        const engine = this._namesToEnginesMap[_.toLower(engineName)];
        const lowerLang = _.toLower(_.trim(language));

        if (_.isNil(engine)) {
            // Engine is present in pipeline,
            // but no definition exists.
            logger.warn(`Skipping engine "${engineName}"`);
            return Promise.resolve();
        }

        if ((_.isEmpty(engine.languages)) || (_.findIndex(engine.languages, lang =>
            _.eq(_.toLower(_.trim(lang)), lowerLang)
        ) > -1)) {
            return engine.analyzeFile(hostPath, language, content, context)
                .catch((err) => {
                    logger.error(
                        'File analysis failed', {
                            engine: engineName,
                            err
                        });
                });
        }

        return Promise.resolve();
    }

    static _getSingleEngine(engineDef) {
        const engineName = _.head(_.keys(engineDef));

        if (_.includes(['bundle', 'sequence'], engineName)) {
            return null;
        }

        return {
            engineName,
            engineParams: _.get(engineDef, engineName, {})
        };
    }

    run(hostPath, language, content, context, engineStatuses) {
        return this._runPipeline(this._pipeLineDefinition, hostPath, language, content, context, engineStatuses);
    }

    _runPipeline(pipeLine, hostPath, language, content, context, engineStatuses) {
        const bundle = _.get(pipeLine, 'bundle');
        const seq = _.get(pipeLine, 'sequence');

        try {
            const newContext = _.cloneDeep(context);

            if (!_.isNil(bundle)) {
                // Process engines asynchronously
                return Promise.all(
                    _.map(bundle, (value) => {
                        const singleEntry = EnginePipeline._getSingleEngine(value);

                        if (_.isNil(singleEntry)) {
                            return this._runPipeline(
                                value, hostPath, language, content, newContext, engineStatuses);
                        }
                        newContext.engineParams = singleEntry.engineParams;
                        return this._runSingleEngine(singleEntry.engineName, hostPath, language, content, newContext);
                    })
                ).then((res) => {
                    const results = _.compact(res);
                    const bundleResults = _.reduce(results, (accum, oneResult) => {
                        const status = _.get(oneResult, 'status');
                        const warnings = _.get(oneResult, 'warnings');

                        // Since we are running engines in parallel,
                        // we need to collect and accumulate output of all engines.
                        if (!_.isNil(warnings)) {
                            // lazy ignore-once no-param-reassign
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
                return _.reduce(seq, (engineRunner, value) =>
                    engineRunner.then((results) => {
                        // Pass the results of this step
                        // to the next engine in sequence via context param
                        const singleEntry = EnginePipeline._getSingleEngine(value);

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
                            return this._runPipeline(
                                value, hostPath, language, content, newContext, engineStatuses);
                        }
                        newContext.engineParams = singleEntry.engineParams;
                        return this._runSingleEngine(singleEntry.engineName, hostPath, language, content, newContext);
                    }), Promise.resolve());
            }
        } catch (err) {
            return Promise.reject(err);
        }
        return Promise.reject(new Error('Bad engine pipeline config.'));
    }
}

module.exports = EnginePipeline;
