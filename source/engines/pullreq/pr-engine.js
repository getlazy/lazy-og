'use strict';

const _ = require('lodash');
const EngineHelpers = require('@lazyass/engine-helpers');
const RepoLinter = require('./app/repo-linter.js');

const EngineHttpServer = EngineHelpers.EngineHttpServer;

class PREngineHttpServer extends EngineHttpServer {
    /**
     * Get all PR comments and turn them into lint messages.
     * @param {string} hostPath Path of the source file requesting lazy to analyze.
     * @param {string} language Language of the source file.
     * @param {string} content Content of the source file requesting lazy to analyze.
     * @param {string} context Context information included with the request.
     * @return {Promise} Promise resolving with results of the both file and PR analysis.
     */
    analyzeFile(hostPath, language, content, context) {
        return new Promise((resolve) => {
            const repoLinter = new RepoLinter();
            repoLinter.lintRepo(context).then((prComments) => {
                const warnings = _.reduce(prComments, (result, comment) => {
                    return _.concat(result, {
                        type: 'PR',
                        message: `@${comment.reviewer}: ${comment.message}`,
                        line: comment.line,
                        column: 1,
                        moreInfo: comment.url
                    });
                }, []);
                resolve({
                    warnings: warnings
                });
            });
        });
    }

    getMeta() {
        return {
            languages: []
        };
    }
}

class Engine {
    start() {
        const port = process.env.PORT || 80;
        this._server = new PREngineHttpServer(port);
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
