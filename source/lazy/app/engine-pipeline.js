
'use strict';

/* global logger */

const _ = require('lodash');

//  Keep running the promises returned by the given action while the given condition returns true.
const asyncWhile = (condition, action) => {
    const whilst = () => (condition() ? action().then(whilst) : Promise.resolve());

    return whilst();
};

class EnginePipeline {
    constructor(engines, enginePipelineDefinition) {
        this._pipeLineDefinition = enginePipelineDefinition;
        this._populateLanguagesToEnginesStructures(engines);
    }

    _populateLanguagesToEnginesStructures(engines) {
        this._namesToEnginesMap = new Map();

        _.forEach(engines, (engine) => {
            this._namesToEnginesMap[_.toLower(engine.name)] = engine;
        });
    }

    _runSingleEngine(engineName, hostPath, language, content, context) {
        const engine = this._namesToEnginesMap[_.toLower(engineName)];
        const lowerLang = _.toLower(_.trim(language));

        if (_.isNil(engine)) {
            //  Engine is present in pipeline, but no definition exists.
            logger.warn(`Skipping engine "${engineName}"`);
            //  We carry forward the results of the previous engine.
            return Promise.resolve(context.previousStepResults);
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

    analyzeFile(hostPath, language, content, context, refEngineStatuses) {
        return this._runPipeline(
            this._pipeLineDefinition, hostPath, language, content, context, refEngineStatuses);
    }

    _runPipeline(pipeLine, hostPath, language, content, context, refEngineStatuses) {
        const bundle = _.get(pipeLine, 'bundle');
        const sequence = _.get(pipeLine, 'sequence');

        try {
            const newContext = _.cloneDeep(context) || {};

            if (!_.isNil(bundle)) {
                // Process engines asynchronously
                return Promise.all(
                    _.map(bundle, (value) => {
                        const singleEntry = EnginePipeline._getSingleEngine(value);

                        if (_.isNil(singleEntry)) {
                            return this._runPipeline(
                                value, hostPath, language, content, newContext, refEngineStatuses);
                        }
                        newContext.engineParams = singleEntry.engineParams;
                        return this._runSingleEngine(
                            singleEntry.engineName, hostPath, language, content, newContext);
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
                        if (!_.isNil(status) && _.isArray(refEngineStatuses)) {
                            refEngineStatuses.push(status);
                        }
                        return accum;
                    }, {
                        warnings: []
                    });

                    return Promise.resolve(bundleResults);
                });
            }

            if (!_.isNil(sequence)) {
                let i = 0;
                let error;

                //  Run engines sequentially until we have through all of them or one has returned
                //  en error.
                return asyncWhile(
                    () => i < sequence.length && _.isNil(error),
                    //  Execute the actual sequence item and return the promise for the execution.
                    //  That promise will be handled below this entire function.
                    () => (() => {
                        //  Get the current engine item in sequence.
                        const sequenceItem = sequence[i];
                        const engineItem = EnginePipeline._getSingleEngine(sequenceItem);

                        //  If there is no engine item then it's either a sequence or a bundle
                        //  so continue running there.
                        if (_.isNil(engineItem)) {
                            return this._runPipeline(
                                sequenceItem, hostPath, language, content, newContext, refEngineStatuses);
                        }

                        //  Run the engine with its params.
                        newContext.engineParams = engineItem.engineParams;
                        return this._runSingleEngine(engineItem.engineName, hostPath, language, content, newContext)
                    })()
                        //  Process the results no matter if we ran the engine or another pipeline.
                        .then(results => {
                            //  If the engine returned a status, add it to our list of statuses
                            //  but don't pass it to the next engine (that is remove it from
                            //  the results). This solves the problem of repeating statuses with
                            //  skipped engines.
                            const status = _.get(results, 'status');
                            if (!_.isNil(status)) {
                                if (_.isArray(refEngineStatuses)) {
                                    refEngineStatuses.push(status);
                                }

                                //  Setting to undefined is faster than deleting property.
                                results.status = undefined;
                            }

                            newContext.previousStepResults = results;
                        })
                        //  Capture the error if it happens. Note that an engine could reject the promise
                        //  with a nil error in which case we will continue onto the next engine.
                        .catch(err => error = err)
                        //  Error or not increment the index in the sequence to get the next engine.
                        .then(() => ++i)
                )
                    .then(() => {
                        if (error) {
                            return Promise.reject(error);
                        }

                        return Promise.resolve(newContext.previousStepResults);
                    });
            }
        } catch (err) {
            return Promise.reject(err);
        }
        return Promise.reject(new Error('Bad engine pipeline config.'));
    }
}

module.exports = EnginePipeline;
