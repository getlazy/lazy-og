
'use strict';

/* global logger */

const _ = require('lodash');
const EngineHelpers = require('@lazyass/engine-helpers');

const EngineHttpServer = EngineHelpers.EngineHttpServer;

//  We are implicitly using `this` in overridden methods but eslint keep telling us not to.
/* eslint class-methods-use-this: off */
class FileStatsEngineHttpServer extends EngineHttpServer
{
    // TODO: Move this to lazy-common as it was copied from pullreq engine.
    static repoFromRemote(remote) {
        const httpProtocolRegex = /^https:\/\/github.com\/(.+)\/(.+)\.git/g;
        const httpFetch = httpProtocolRegex.exec(remote);
        if (httpFetch) {
            return {
                owner: httpFetch[1],
                repo: httpFetch[2]
            };
        }

        const sshProtocolRegex = /^git@github.com:(.+)\/(.+)\.git/g;
        const sshFetch = sshProtocolRegex.exec(remote);
        if (sshFetch) {
            return {
                owner: sshFetch[1],
                repo: sshFetch[2]
            };
        }

        return remote;
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
            const data = {
                time: Date.now(),
                hostname: context && context.hostname,
                hostPath,
                language,
                client: context && context.client,
                originRepository: FileStatsEngineHttpServer.repoFromRemote(_
                    .chain(context)
                    .get('repositoryInformation.remotes')
                    .find(remote => remote && _.eq(remote.name, 'origin'))
                    .get('refs.fetch')
                    .value()),
                branch: _.get(context, 'repositoryInformation.status.current')
            };

            logger.metric('analyze-file', data);

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
