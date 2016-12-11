
'use strict';

const _ = require('lodash');

const EngineHelpers = require('@lazyass/engine-helpers');
const EngineHttpServer = EngineHelpers.EngineHttpServer;

const quoteUnquoteDatabase = {};

class FileStatsEngine
{
    /**
     * Analyzes the given file content for the given language and analysis configuration.
     * @param {string} host Name of the host requesting file analysis.
     * @param {string} hostPath Path of the source file requesting lazy to analyze.
     * @param {string} language Language of the source file.
     * @param {string} content Content of the source file requesting lazy to analyze.
     * @param {string} config Name of the configuration to use.
     * @return {Promise} Promise resolving with results of the file analysis.
     */
    analyzeFile(host, hostPath, language, content, config) {
        //  We use a promise as we get any exceptions wrapped up as failures.
        return new Promise((resolve) => {
            const fileKey = 'file|' + host + '|' + hostPath;
            let fileStats = quoteUnquoteDatabase[fileKey];
            if (_.isUndefined(fileStats)) {
                fileStats = {
                    analysisCounter: 0
                };
            }

            ++fileStats.analysisCounter;
            quoteUnquoteDatabase[fileKey] = fileStats;

            const languageKey = 'language|' + language;
            let languageStats = quoteUnquoteDatabase[languageKey];
            if (_.isUndefined(languageStats)) {
                languageStats = {
                    analysisCounter: 0
                };
            }

            ++languageStats.analysisCounter;
            quoteUnquoteDatabase[languageKey] = languageStats;

            logger.warn('quoteUnquoteDatabase', JSON.stringify(quoteUnquoteDatabase, null, 4));

            resolve({
                stats: fileStats
            });
        });
    }
}

class EslintEngineHttpServer extends EngineHttpServer
{
    _bootEngine() {
        return Promise.resolve(new FileStatsEngine());
    }

    _stopEngine() {
        return Promise.resolve();
    }
}

class Engine
{
    start() {
        const port = process.env.PORT || 80;
        this._server = new EslintEngineHttpServer(port);
        return this._server.start();
    }

    stop() {
        return this._server.stop()
            .then(() => {
                this._server = null;
            });
    }
}

module.exports = Engine;
