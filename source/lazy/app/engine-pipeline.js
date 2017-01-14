
'use strict';

/* global logger */

const _ = require('lodash');
const fp = require('lodash/fp');
const detect = require('language-detect');

//  Keep running the promises returned by the given action while the given condition returns true.
const asyncWhile = (condition, action) => {
    const whilst = () => (condition() ? action().then(whilst) : Promise.resolve());

    return whilst();
};

class EnginePipeline {
    constructor(engines, enginePipelineDefinition) {
        this._pipeLineDefinition = enginePipelineDefinition;
        this._namesToEnginesMap = new Map();
        this._languagesToEnginesMap = new Map();
        this._allLanguagesEngines = [];
        this._populateEngineMaps(engines);
    }

    _populateEngineMaps(engines) {
        _.forEach(engines, (engine) => {
            this._namesToEnginesMap[_.toLower(engine.name)] = engine;

            //  Clean up languages removing empty ones and non-strings (just in case).
            const engineLanguages = fp.flow([
                // lazy ignore lodash/prefer-lodash-method ; this is a lodash method!
                fp.map(fp.flow(_.trim, _.toLower)),
                fp.reject(language => _.isEmpty(language) || !_.isString(language))
            ])(engine.languages);

            //  Either put the engine into the one applied to all languages or
            //  put it into languages-to-engines map.
            if (_.isEmpty(engineLanguages)) {
                this._allLanguagesEngines.push(engine);
            } else {
                _.forEach(engineLanguages, (language) => {
                    const enginesForLanguage = this._languagesToEnginesMap.get(language);
                    if (enginesForLanguage) {
                        enginesForLanguage.push(engine);
                    } else {
                        this._languagesToEnginesMap.set(language, [engine]);
                    }
                });
            }
        });
    }

    _runSingleEngine(prefilteredEngines, engineName, hostPath, language, content, context) {
        const engine = this._namesToEnginesMap[_.toLower(engineName)];

        if (_.isNil(engine)) {
            //  Engine is present in pipeline, but no definition exists.
            logger.warn(`Skipping engine "${engineName}"`);
            //  We carry forward the results of the previous engine.
            return Promise.resolve(context.previousStepResults);
        }

        if (_.includes(prefilteredEngines, engine)) {
            return engine.analyzeFile(hostPath, language, content, context);
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
        //  Detect the language and run the engines for both the detected and the declared language.
        //  This way even if we got an incorrect language or no language, we will be able to
        //  analyze the file to the best of our abilities.

        //  Always include engines for all languages and for the declared language.
        const lowerCaseLanguage = _.toLower(language);
        let engines = _.union(this._languagesToEnginesMap.get(lowerCaseLanguage),
            this._allLanguagesEngines);

        if (!_.isEmpty(hostPath) && !_.isEmpty(content)) {
            const detectedLanguage = _.toLower(detect.contents(hostPath, content));
            //  If detected and declared languages are not one and the same include engines for
            //  the detected language as well.
            if (lowerCaseLanguage !== detectedLanguage) {
                logger.warn(`Detected language ${detectedLanguage} !== ${lowerCaseLanguage}`);
                engines = _.union(engines, this._languagesToEnginesMap.get(detectedLanguage));
            }
        }

        //  Eliminate duplicate engines.
        engines = _.uniq(engines);

        //  Run the pipleine from the root.
        return this._runPipeline(
            engines, this._pipeLineDefinition, hostPath, language, content, context, refEngineStatuses);
    }

    _runPipeline(prefilteredEngines, pipeLine, hostPath, language, content, context, refEngineStatuses) {
        const bundle = _.get(pipeLine, 'bundle');
        const sequence = _.get(pipeLine, 'sequence');

        try {
            const newContext = _.cloneDeep(context) || {};

            if (!_.isNil(bundle)) {
                // Process engines asynchronously but ignore each separate failure.
                return Promise.all(
                    _.map(bundle, bundleItem =>
                        (() => {
                            const singleEntry = EnginePipeline._getSingleEngine(bundleItem);

                            if (_.isNil(singleEntry)) {
                                return this._runPipeline(
                                    prefilteredEngines, bundleItem, hostPath, language, content, newContext,
                                    refEngineStatuses);
                            }

                            //  Run the engine with its params.
                            newContext.engineParams = singleEntry.engineParams;
                            return this._runSingleEngine(
                                prefilteredEngines, singleEntry.engineName, hostPath, language, content, newContext);
                        })()
                            .catch((err) => {
                                logger.warn('Failure during bundle pipleline run, continuing', err);
                            })
                    )
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
                                prefilteredEngines, sequenceItem, hostPath, language, content, newContext,
                                refEngineStatuses);
                        }

                        //  Run the engine with its params.
                        newContext.engineParams = engineItem.engineParams;
                        return this._runSingleEngine(
                            prefilteredEngines, engineItem.engineName, hostPath, language, content, newContext);
                    })()
                        //  Process the results no matter if we ran the engine or another pipeline.
                        .then((results) => {
                            //  If the engine returned a status, add it to our list of statuses
                            //  but don't pass it to the next engine (that is remove it from
                            //  the results). This solves the problem of repeating statuses with
                            //  skipped engines.
                            const status = _.get(results, 'status');
                            if (!_.isNil(status)) {
                                // istanbul ignore else
                                if (_.isArray(refEngineStatuses)) {
                                    refEngineStatuses.push(status);
                                }

                                //  Setting to undefined is faster than deleting property.
                                //  lazy ignore-once no-param-reassign
                                results.status = undefined;
                            }

                            newContext.previousStepResults = results;
                        })
                        //  Capture the error if it happens. Note that an engine could reject the promise
                        //  with a nil error in which case we will continue onto the next engine.
                        .catch((err) => {
                            logger.error('Failure during sequence pipleline run, stopping', err);
                            error = err;
                        })
                        //  Error or not increment the index in the sequence to get the next engine.
                        .then(() => { i += 1; })
                )
                    .then(() => {
                        if (error) {
                            return Promise.reject(error);
                        }

                        return Promise.resolve(newContext.previousStepResults);
                    });
            }
        } catch (err) {
            // istanbul ignore next
            return Promise.reject(err);
        }
        return Promise.reject(new Error('Bad engine pipeline config.'));
    }
}

module.exports = EnginePipeline;
