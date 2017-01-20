
'use strict';

/* global logger */

const _ = require('lodash'); // lazy ignore-once lodash/import-scope ; we want whole lotta lodash...

// Keep running the promises returned by the given action while the given condition returns true.
const asyncWhile = (condition, action) => {
    const whilst = () => (condition() ? action().then(whilst) : Promise.resolve());

    return whilst();
};

class EnginePipelineRun {
    constructor(namesToEnginesMap, prefilteredEngines, pipelineRoot, hostPath, language, content, context) {
        this._namesToEnginesMap = namesToEnginesMap;
        this._prefilteredEngines = prefilteredEngines;
        this._pipelineRoot = pipelineRoot;
        this._hostPath = hostPath;
        this._language = language;
        this._content = content;
        this._context = context;
        this._alreadyRan = false;
    }

    run() {
        // istanbul ignore if
        if (this._alreadyRan) {
            throw new Error('EnginePipelineRun can be run only once');
        }

        this._alreadyRan = true;
        return this._runPipeline(this._pipelineRoot, this._context);
    }

    _runPipeline(pipeline, context) {
        const bundle = _.get(pipeline, 'bundle');
        const sequence = _.get(pipeline, 'sequence');

        try {
            if (!_.isNil(bundle)) {
                return this._runBundle(bundle, context);
            }

            if (!_.isNil(sequence)) {
                return this._runSequence(sequence, context);
            }
        } catch (err) {
            // istanbul ignore next
            return Promise.reject(err);
        }
        return Promise.reject(new Error('Bad engine pipeline config.'));
    }

    _runSingleEngine(engineName, context) {
        const engine = this._namesToEnginesMap[_.toLower(engineName)];

        if (_.isNil(engine)) {
            // Engine is present in pipeline, but no definition exists.
            logger.warn('Skipping inexisting engine', {
                engine: engineName
            });
            // We carry forward the results of the previous engine.
            return Promise.resolve(context.previousStepResults);
        }

        if (_.includes(this._prefilteredEngines, engine)) {
            return engine.analyzeFile(this._hostPath, this._language, this._content, context);
        }

        return Promise.resolve();
    }

    static _getEngineItem(engineDef) {
        const engineName = _.head(_.keys(engineDef));

        if (_.includes(['bundle', 'sequence'], engineName)) {
            return null;
        }

        return {
            engineName,
            engineParams: _.get(engineDef, engineName, {})
        };
    }

    _runBundle(bundle, context) {
        const newContext = _.cloneDeep(context) || {};

        // Process engines asynchronously but ignore each separate failure.
        return Promise.all(
            _.map(bundle, bundleItem =>
                (() => {
                    const engineItem = EnginePipelineRun._getEngineItem(bundleItem);

                    if (_.isNil(engineItem)) {
                        return this._runPipeline(bundleItem, newContext);
                    }

                    // Run the engine with its params.
                    newContext.engineParams = engineItem.engineParams;
                    return this._runSingleEngine(engineItem.engineName, newContext);
                })()
                    .catch((err) => {
                        logger.warn('Failure during bundle pipleline run, continuing', {
                            err
                        });
                    })
            )
        ).then((res) => {
            const results = _.compact(res);
            const bundleResults = _.reduce(results, (accum, oneResult) => {
                // Since we are running engines in parallel,
                // we need to collect and accumulate output of all engines.
                _.assignInWith(accum, oneResult, (accumValue, resultValue) => {
                    // do not allow undefined value to overwrite something that is defined
                    if (_.isUndefined(resultValue)) {
                        return accumValue;
                    }

                    // if the property is array, then merge them instead of overwriting
                    if (_.isArray(resultValue)) {
                        return _.union(accumValue, resultValue);
                    }

                    return undefined; // Leave the rest to default assignement rules.
                });
                return accum;
            }, {});
            return Promise.resolve(bundleResults);
        });
    }

    _runSequence(sequence, context) {
        const newContext = _.cloneDeep(context) || {};

        let i = 0;
        let error;

        // In sequencing engines (seq A -> Seq B), we need to accumulate results of each engine,
        // in such a way that output from seq B overrides output from seq A,
        // while the parts of seq A that are not modified by seq B remain the same
        const sequenceResults = {};

        // Run engines sequentially until we have through all of them or one has returned
        // en error.
        return asyncWhile(
            () => i < sequence.length && _.isNil(error),
            // Execute the actual sequence item and return the promise for the execution.
            // That promise will be handled below this entire function.
            () => (() => {
                // Get the current engine item in sequence.
                const sequenceItem = sequence[i];
                const engineItem = EnginePipelineRun._getEngineItem(sequenceItem);

                // If there is no engine item then it's either a sequence or a bundle
                // so continue running there.
                if (_.isNil(engineItem)) {
                    return this._runPipeline(sequenceItem, newContext);
                }

                // Run the engine with its params.
                newContext.engineParams = engineItem.engineParams;
                return this._runSingleEngine(engineItem.engineName, newContext);
            })()
                // Process the results no matter if we ran the engine or another pipeline.
                .then((results) => {
                    // Merge the results so that latest one overrides former.
                    _.assignIn(sequenceResults, results);
                    newContext.previousStepResults = _.cloneDeep(sequenceResults);
                })
                // Capture the error if it happens. Note that an engine could reject the promise
                // with a nil error in which case we will continue onto the next engine.
                .catch((err) => {
                    logger.error('Failure during sequence pipleline run, stopping', { err });
                    error = err;
                })
                // Error or not increment the index in the sequence to get the next engine.
                .then(() => { i += 1; })
        )
            .then(() => {
                if (error) {
                    return Promise.reject(error);
                }

                return Promise.resolve(sequenceResults);
            });
    }
}

module.exports = EnginePipelineRun;
