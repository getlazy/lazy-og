
'use strict';

const low = require('lowdb');
const fs = require('fs');

const EngineHelpers = require('@lazyass/engine-helpers');
const EngineHttpServer = EngineHelpers.EngineHttpServer;

//  Create directory for our json database.
if (!fs.existsSync('/lazy/file-stats-engine')) {
    fs.mkdirSync('/lazy/file-stats-engine');
}

const db = low('/lazy/file-stats-engine/stats.json', {
    storage: require('lowdb/lib/file-async')
});

//  Create the schema.
db.defaults({
    AnalyzeFileEvent: []
})
    .value();

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
            //  We capture the events and then later extract the stats on-demand.
            db.get('AnalyzeFileEvent')
                .push({
                    time: Date.now(),
                    host: host,
                    hostPath: hostPath,
                    language: language
                })
                .value();

            resolve({});
        });
    }
}

class FileStatsEngineHttpServer extends EngineHttpServer
{
    _bootEngine() {
        return Promise.resolve(new FileStatsEngine());
    }

    _customizeExpressApp(app) {
        logger.warn('customizing');
        app.get('/stats', (req, res) => {
            const stats = db.get('AnalyzeFileEvent')
                .reduce((stats, event) => {
                    ++stats.requests;
                    stats.requestsPerLanguage[event.language] =
                        (stats.requestsPerLanguage[event.language] + 1) || 1;
                    stats.requestsPerPath[event.hostPath] =
                        (stats.requestsPerPath[event.hostPath] + 1) || 1;
                    return stats;
                }, {
                    requests: 0,
                    requestsPerLanguage: {},
                    requestsPerPath: {}
                })
                .value();

            res.send(stats);
        });
    }

    _stopEngine() {
        return Promise.resolve();
    }
}

class Engine
{
    start() {
        const port = process.env.PORT || 80;
        this._server = new FileStatsEngineHttpServer(port);
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
