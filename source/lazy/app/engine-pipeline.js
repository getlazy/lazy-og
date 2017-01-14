
'use strict';

/* global logger */

const _ = require('lodash');
const fp = require('lodash/fp');
const detect = require('language-detect');
const EnginePipelineRun = require('./engine-pipeline-run');

class EnginePipeline {
    constructor(engines, pipelineRoot) {
        this._pipelineRoot = pipelineRoot;
        this._namesToEnginesMap = new Map();
        this._languagesToEnginesMap = new Map();
        this._allLanguagesEngines = [];
        this._populateEngineMaps(engines);
    }

    _populateEngineMaps(engines) {
        _.forEach(engines, (engine) => {
            this._namesToEnginesMap[_.toLower(engine.name)] = engine;

            // Clean up languages removing empty ones and non-strings (just in case).
            const engineLanguages = fp.flow([
                // lazy ignore lodash/prefer-lodash-method ; this is a lodash method!
                fp.map(fp.flow(_.trim, _.toLower)),
                fp.reject(language => _.isEmpty(language) || !_.isString(language))
            ])(engine.languages);

            // Either put the engine into the one applied to all languages or
            // put it into languages-to-engines map.
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

    analyzeFile(hostPath, language, content, context, refEngineStatuses) {
        // Detect the language and run the engines for both the detected and the declared language.
        // This way even if we got an incorrect language or no language, we will be able to
        // analyze the file to the best of our abilities.

        // Always include engines for all languages and for the declared language.
        const lowerCaseLanguage = _.toLower(language);
        let engines = _.union(this._languagesToEnginesMap.get(lowerCaseLanguage),
            this._allLanguagesEngines);

        if (!_.isEmpty(hostPath) && !_.isEmpty(content)) {
            const detectedLanguage = _.toLower(detect.contents(hostPath, content));
            // If detected and declared languages are not one and the same include engines for
            // the detected language as well.
            if (lowerCaseLanguage !== detectedLanguage) {
                logger.warn(`Detected language ${detectedLanguage} !== ${lowerCaseLanguage}`);
                engines = _.union(engines, this._languagesToEnginesMap.get(detectedLanguage));
                // Add the detected language to context so that engines can potentially make
                // use of it.
                // lazy ignore-once no-param-reassign
                context = _.assignIn(context || {}, {
                    lazy: {
                        detectedLanguage
                    }
                });
            }
        }

        // Eliminate duplicate engines.
        engines = _.uniq(engines);

        // Run the pipleine from the root.
        const pipelineRun = new EnginePipelineRun(this._namesToEnginesMap, engines,
            this._pipelineRoot, hostPath, language, content, context);
        return pipelineRun.run()
            .then((results) => {
                //  Merge engine statuses on success.
                EnginePipeline._mergeEngineStatuses(refEngineStatuses, pipelineRun.engineStatuses);
                return Promise.resolve(results);
            })
            .catch((err) => {
                //  Merge engine statuses on failure.
                EnginePipeline._mergeEngineStatuses(refEngineStatuses, pipelineRun.engineStatuses);
                return Promise.reject(err);
            });
    }

    static _mergeEngineStatuses(refEngineStatuses, runEngineStatuses) {
        // istanbul ignore next
        if (_.isArray(refEngineStatuses)) {
            //  Merge the resulting engine statuses to the given "reference" to array.
            Array.prototype.push.apply(refEngineStatuses, runEngineStatuses);
        }
    }
}

module.exports = EnginePipeline;
