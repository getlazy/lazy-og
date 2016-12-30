
'use strict';

const _ = require('lodash');
const low = require('lowdb');
//  lowdb uses lodash internally but eslint cannot know that.
/* eslint lodash/prefer-lodash-method: off */
const LowdbLibFileAsync = require('lowdb/lib/file-async');
const mkdirp = require('mkdirp');
const EngineHelpers = require('@lazyass/engine-helpers');

const EngineHttpServer = EngineHelpers.EngineHttpServer;

const LAZY_ENGINE_SANDBOX_DIR = process.env.LAZY_ENGINE_SANDBOX_DIR;

//  We are implicitly using `this` in overriden methods but eslint keep telling us not to.
/* eslint class-methods-use-this: off */
class FileStatsEngineHttpServer extends EngineHttpServer
{
    beforeListening() {
        //  Create directory for our json database.
        mkdirp.sync(LAZY_ENGINE_SANDBOX_DIR);

        this._db = low(`${LAZY_ENGINE_SANDBOX_DIR}/stats.json`, {
            storage: LowdbLibFileAsync
        });

        //  Create the schema.
        this._db.defaults({
            AnalyzeFileEvent: []
        })
            .value();

        return Promise.resolve();
    }

    customizeExpressApp(app) {
        app.get('/', (req, res) => {
            res.send(this._db.get('AnalyzeFileEvent').value());
        });

        app.get('/stats/time', (req, res) => {
            const TIME_INTERVAL_MS = 5 * 60 * 1000;
            //  Count the language requests in time intervals.
            const stats = this._db.get('AnalyzeFileEvent')
                .groupBy(event => TIME_INTERVAL_MS * _.floor(event.time / TIME_INTERVAL_MS))
                .mapValues(events => _.countBy(events, event =>
                    event.originRepository || '<unknown>'))
                .value();

            res.send(stats);
        });

        app.get('/stats', (req, res) => {
            const stats = this._db.get('AnalyzeFileEvent')
                .reduce((statsReduce, event) => {
                    /* eslint no-param-reassign: off */
                    statsReduce.requests += 1;
                    statsReduce.requestsPerLanguage[event.language] =
                        (statsReduce.requestsPerLanguage[event.language] + 1) || 1;
                    statsReduce.requestsPerPath[event.hostPath] =
                        (statsReduce.requestsPerPath[event.hostPath] + 1) || 1;
                    if (event.client) {
                        statsReduce.requestsPerClient[event.client] =
                            (statsReduce.requestsPerClient[event.client] + 1) || 1;
                    }
                    if (event.originRepository && event.branch) {
                        const key = `${event.originRepository}:${event.branch}`;
                        statsReduce.requestsPerOriginRepositoryBranch[key] =
                            (statsReduce.requestsPerOriginRepositoryBranch[key] + 1) || 1;
                    }
                    return statsReduce;
                }, {
                    requests: 0,
                    requestsPerLanguage: {},
                    requestsPerPath: {},
                    requestsPerClient: {},
                    requestsPerOriginRepositoryBranch: {}
                })
                .value();

            res.send(stats);
        });
    }

    /**
     * Analyzes the given file content for the given language and analysis configuration.
     * @param {string} host Name of the host requesting file analysis.
     * @param {string} hostPath Path of the source file requesting lazy to analyze.
     * @param {string} language Language of the source file.
     * @param {string} content Content of the source file requesting lazy to analyze.
     * @param {string} context Context information included with the request.
     * @return {Promise} Promise resolving with results of the file analysis.
     */
    analyzeFile(hostPath, language, content, context) {
        const self = this;

        //  We use a promise as we get any exceptions wrapped up as failures.
        return new Promise((resolve) => {
            //  We capture the events and then later extract the stats on-demand.
            self._db.get('AnalyzeFileEvent')
                .push({
                    time: Date.now(),
                    hostname: context && context.hostname,
                    hostPath,
                    language,
                    client: context && context.client,
                    originRepository: _
                        .chain(context)
                        .get('repositoryInformation.remotes')
                        .find(remote => remote && _.eq(remote.name, 'origin'))
                        .get('refs.fetch')
                        .value(),
                    branch: _.get(context, 'repositoryInformation.status.current')
                })
                .value();

            resolve({});
        });
    }

    getMeta() {
        return {
            languages: []
        };
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
