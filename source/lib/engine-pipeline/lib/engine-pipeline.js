
'use strict';

const _ = require('lodash');
const fp = require('lodash/fp');
const detect = require('language-detect');
const EnginePipelineRun = require('./engine-pipeline-run');
const logger = require('@getlazy/common').createPackageLogger('lazy-engine-pipeline');
const EventEmitter = require('events');

/**
 * Class implementing public interface of the module. Internally it uses EnginePipelineRun for
 * each run.
 */
class EnginePipeline extends EventEmitter {
    /**
     * Constructs EnginePipeline object and prepares it for running.
     * @param {Array} `engines` An array of engine objects on which the requested task can be performed.
     * @param {Object} `pipelineRoot` An object holding the root of execution pipeline with all its branches.
     */
    constructor(engines, pipelineRoot) {
        super();
        this._pipelineRoot = pipelineRoot;
        this._idToEngineMap = new Map();
        this._languageToEnginesMap = new Map();
        this._allLanguagesEngines = [];
        this._populateEngineMaps(engines);
    }

    _populateEngineMaps(engines) {
        _.forEach(engines, (engine) => {
            this._idToEngineMap[_.toLower(engine.id)] = engine;

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
                    const enginesForLanguage = this._languageToEnginesMap.get(language);
                    if (enginesForLanguage) {
                        enginesForLanguage.push(engine);
                    } else {
                        this._languageToEnginesMap.set(language, [engine]);
                    }
                });
            }
        });
    }

    analyzeFile(hostPath, language, content, context) {
        // Detect the language and run the engines for both the detected and the declared language.
        // This way even if we got an incorrect language or no language, we will be able to
        // analyze the file to the best of our abilities.

        // Always include engines for all languages and for the declared language.
        const lowerCaseLanguage = _.toLower(language);
        let engines = _.union(this._languageToEnginesMap.get(lowerCaseLanguage),
            this._allLanguagesEngines);

        if (!_.isEmpty(hostPath) && !_.isEmpty(content)) {
            const detectedLanguage = _.toLower(detect.contents(hostPath, content));
            // If detected and declared languages are not one and the same include engines for
            // the detected language as well.
            if (lowerCaseLanguage !== detectedLanguage) {
                logger.warn('Detected language mismatches passed language', {
                    detectedLanguage, passedLanguage: lowerCaseLanguage
                });
                engines = _.union(engines, this._languageToEnginesMap.get(detectedLanguage));
            }

            // Add the detected language to context so that engines can potentially make
            // use of it.
            // lazy ignore-once no-param-reassign
            context = context || {};
            // lazy ignore-once no-param-reassign
            context.lazy = _.assignIn(context.lazy || {}, { detectedLanguage });
        }

        // Eliminate duplicate engines.
        engines = _.uniq(engines);

        // Create the pipeline.
        const pipelineRun = new EnginePipelineRun(this._idToEngineMap, engines,
            this._pipelineRoot, hostPath, language, content, context);

        // Prepare to log metrics.
        const metricBase = EnginePipeline._getMetricBase(hostPath, lowerCaseLanguage, context);
        pipelineRun.on('metrics', (engineId, metrics) => {
            this.emit('metrics', _.map(metrics, metric => _.assignIn(metric, metricBase, { engineId })));
        });

        return pipelineRun.run();
    }

    // TODO: Move this to lazy-common as it was copied from pullreq engine.
    static _getRepositoryNameFromFetch(remote) {
        if (!_.isString(remote)) {
            return remote;
        }

        const httpProtocolRegex = /^https:\/\/github.com\/(.+)\/(.+)\.git/g;
        const httpFetch = httpProtocolRegex.exec(remote);
        if (httpFetch) {
            return {
                owner: httpFetch[1],
                name: httpFetch[2]
            };
        }

        const sshProtocolRegex = /^git@github.com:(.+)\/(.+)\.git/g;
        const sshFetch = sshProtocolRegex.exec(remote);
        if (sshFetch) {
            return {
                owner: sshFetch[1],
                name: sshFetch[2]
            };
        }

        return remote;
    }

    static _getMetricBase(hostPath, language, context) {
        return {
            hostname: context && context.hostname,
            hostPath,
            language,
            detectedLanguage: _.get(context, 'lazy.detectedLanguage'),
            client: context && context.client,
            repository: EnginePipeline._getRepositoryNameFromFetch(
                EnginePipeline._getBestRepositoryFetchFromRemotes(_.get(context, 'repositoryInformation.remotes'))),
            branch: _.get(context, 'repositoryInformation.status.current')
        };
    }

    static _getBestRepositoryFetchFromRemotes(remotes) {
        // lazy ignore-once lodash/chaining
        return _.chain(remotes)
            // Sort remotes in origin, upstream, alphabetical order
            .sortWithComparator(EnginePipeline._remotesComparator)
            .head()
            .get('refs.fetch')
            .value();
    }

    static _remotesComparator(remote1, remote2) {
        const name1 = _.get(remote1, 'name');
        const name2 = _.get(remote2, 'name');
        if (!name1) {
            if (!name2) {
                return 0;
            }

            return 1;
        }

        if (!name2) {
            return -1;
        }

        if (name1 === name2) {
            return 0;
        }
        if (name1 === 'origin') {
            return -1;
        }
        if (name2 === 'origin') {
            return 1;
        }
        if (name1 === 'upstream') {
            return -1;
        }
        if (name2 === 'upstream') {
            return 1;
        }

        if (name1 < name2) {
            return -1;
        }
        return 1;
    }
}

module.exports = EnginePipeline;
