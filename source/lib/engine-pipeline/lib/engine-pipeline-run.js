
'use strict';

const _ = require('lodash');
const logger = require('@getlazy/common').createPackageLogger('lazy-engine-pipeline');
const EventEmitter = require('events');

// Keep running the promises returned by the given action while the given condition returns true.
const asyncWhile = (condition, action) => {
    const whilst = () => (condition() ? action().then(whilst) : Promise.resolve());

    return whilst();
};

/**
 * Class implementing details of a single pipeline run. This class is used by EnginePipeline and
 * shouldn't be used on its own (which is why it's not exposed in the public interface)
 */
class EnginePipelineRun extends EventEmitter {
    constructor(idToEngineMap, prefilteredEngines, pipelineRoot, hostPath, language, content, context) {
        super();
        this._idToEngineMap = idToEngineMap;
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

    _runPipeline(pipelineNode, context) {
        // Only valid configuration of a node is exactly one non-empty array property named either `bundle` or
        // `sequence`.
        if (_.size(pipelineNode) === 1) {
            try {
                const bundle = _.get(pipelineNode, 'bundle');
                if (_.isArray(bundle) && !_.isEmpty(bundle)) {
                    return this._runBundle(bundle, context);
                }

                const sequence = _.get(pipelineNode, 'sequence');
                if (_.isArray(sequence) && !_.isEmpty(sequence)) {
                    return this._runSequence(sequence, context);
                }
            } catch (err) {
                // istanbul ignore next
                return Promise.reject(err);
            }
        }

        return Promise.reject(new Error('Bad engine pipeline config.'));
    }

    _runSingleEngine(engineId, context) {
        const engine = this._idToEngineMap[_.toLower(engineId)];

        if (_.isNil(engine)) {
            // Engine is present in pipeline, but no definition exists.
            logger.warn('Skipping inexistent engine', { engineId });
            // We carry forward the results of the previous engine.
            return Promise.resolve(context.previousStepResults);
        }

        if (_.includes(this._prefilteredEngines, engine)) {
            return engine.analyzeFile(this._hostPath, this._language, this._content, context)
                .then((res) => {
                    // If engine returned the metrics then emit metrics event so that environment
                    // in which we are running has a chance to store them.
                    if (res.metrics) {
                        // Emit the event on the run's EnginePipeline object.
                        this.emit('metrics', engineId, res.metrics);
                        // Delete the metrics, they shouldn't be accumulated or merged through engine calls.
                        // lazy ignore-once no-param-reassign
                        delete res.metrics;
                    }

                    return Promise.resolve(res);
                });
        }

        return Promise.resolve();
    }

    static _getEngineItem(engineDef) {
        if (_.size(engineDef) !== 1) {
            logger.warn('Ambiguous pipeline definition', { engineDef });
            return null;
        }

        const engineId = _.head(_.keys(engineDef));

        // We accept undefined, null or an object for engineParams.
        // If undefined or null, we use an empty object for engineParams.
        let engineParams = _.get(engineDef, engineId, {});
        if (_.isNull(engineParams)) {
            engineParams = {};
        }

        if (!_.isObject(engineParams)) {
            logger.warn('Bad engine definition', { engineId });
            return null;
        }

        if (_.includes(['bundle', 'sequence'], engineId)) {
            return null;
        }

        return {
            engineId,
            engineParams
        };
    }

    _runBundle(bundle, context) {
        const newContext = _.cloneDeep(context) || {};

        // Process engines asynchronously but ignore each separate failure.
        let engineItem;
        return Promise.all(
            _.map(bundle, bundleItem =>
                (() => {
                    engineItem = EnginePipelineRun._getEngineItem(bundleItem);

                    if (_.isNil(engineItem)) {
                        return this._runPipeline(bundleItem, newContext);
                    }

                    // Run the engine with its params.
                    newContext.engineParams = engineItem.engineParams;
                    return this._runSingleEngine(engineItem.engineId, newContext);
                })()
                    .catch((err) => {
                        logger.warn('Failure during bundle pipleline run, continuing', {
                            err: _.get(err, 'message'),
                            engineId: _.get(engineItem, 'engineId')
                        });
                    })
            )
        ).then((res) => {
            const results = _.compact(res);
            const bundleResults = _.reduce(results, (accum, oneResult) => {
                // Since we are running engines in parallel,
                // we need to collect and accumulate output of all engines.
                _.assignInWith(accum, oneResult, (accumValue, resultValue) => {
                    // Do not allow undefined value to overwrite something that is defined
                    // istanbul ignore next
                    if (_.isUndefined(resultValue)) {
                        return accumValue;
                    }

                    // If the property is array, then merge them instead of overwriting
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

        // In sequencing engines (seq A -> Seq B), we need to accumulate results of each engine,
        // in such a way that output from seq B overrides output from seq A,
        // while the parts of seq A that are not modified by seq B remain the same
        const sequenceResults = {};

        // Run engines sequentially until we have through all of them or one has returned
        // en error.
        let i = 0;
        let error;
        let engineItem;
        return asyncWhile(
            () => i < sequence.length && _.isNil(error),
            // Execute the actual sequence item and return the promise for the execution.
            // That promise will be handled below this entire function.
            () => (() => {
                // Get the current engine item in sequence.
                const sequenceItem = sequence[i];
                engineItem = EnginePipelineRun._getEngineItem(sequenceItem);

                // If there is no engine item then it's either a sequence or a bundle
                // so continue running there.
                if (_.isNil(engineItem)) {
                    return this._runPipeline(sequenceItem, newContext);
                }

                // Run the engine with its params.
                newContext.engineParams = engineItem.engineParams;
                return this._runSingleEngine(engineItem.engineId, newContext);
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
                    logger.error('Failure during sequence pipleline run, stopping', {
                        err: _.get(err, 'message'),
                        engineId: _.get(engineItem, 'engineId')
                    });
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
