
'use strict';

process.env.DEBUG = '*';

const _ = require('lodash');
const low = require('lowdb');
const fs = require('fs');

const EngineHelpers = require('@lazyass/engine-helpers');
const EngineHttpServer = EngineHelpers.EngineHttpServer;

const nbPassport = require('no-boilerplate-passport');

//  Create directory for our json database.
if (!fs.existsSync('/lazy/github-access-engine')) {
    fs.mkdirSync('/lazy/github-access-engine');
}

const db = low('/lazy/github-access-engine/logins.json', {
    storage: require('lowdb/lib/file-async')
});

//  Create the schema.
db.defaults({
    GitHubLogin: []
})
    .value();

class GithubAccessEngine
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
        return Promise.resolve({});
    }
}

class GithubAccessEngineHttpServer extends EngineHttpServer
{
    _bootEngine() {
        return Promise.resolve(new GithubAccessEngine());
    }

    _customizeExpressApp(app) {
        nbPassport(app, {
            version: '1.0.0',
            baseURL: 'https://lazy.ngrok.io/engine/github-access',
            providers: {
                github: {
                    config: {
                        clientID: '160ddd4af8f51c70be8e',
                        clientSecret: '60bddd5a8ee340800f400e954d8090fc7fd15e46',
                        scope: ['repo', 'admin:repo_hook'],
                        userAgent: 'lazyass.io'
                    },
                    callbackURLProperty: 'callbackURL',
                    paths: {
                        start: '/auth/start',
                        callback: '/auth/callback',
                        success: '/engine/github-access',
                        failure: '/engine/github-access/auth/failure'
                    },
                    handler: function(config, token, tokenSecret, profile, done) {
                        const id = profile && profile.username;

                        //  There is no "update or insert" in lowdb so we have to query and then
                        //  decide if we should insert or update.
                        const login = db.get('GitHubLogin')
                            .find({id: id})
                            .value();

                        //  HACK: Obviously unsafe way to store tokens to access sensitive data.
                        if (_.isUndefined(login)) {
                            db.get('GitHubLogin')
                                .push({
                                    id: id,
                                    token: token,
                                    profile: profile,
                                    time: Date.now()
                                })
                                .value();
                        } else {
                            db.get('GitHubLogin')
                                .find({id: id})
                                .assign({
                                    token: token,
                                    profile: profile,
                                    time: Date.now()
                                })
                                .value();
                        }

                        done();
                    }
                }
            }
        });

        app.get('/', (req, res) => {
            //  TODO: Implement this.
            res.sendStatus(200);
        });

        app.get('/auth/failure', (req, res) => {
            //  TODO: Implement this.
            res.sendStatus(200);
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
        this._server = new GithubAccessEngineHttpServer(port);
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
