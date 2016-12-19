
'use strict';

const _ = require('lodash');
const low = require('lowdb');
const fs = require('fs');
const mkdirp = require('mkdirp');

const EngineHelpers = require('@lazyass/engine-helpers');
const EngineHttpServer = EngineHelpers.EngineHttpServer;

const LAZY_ENGINE_NAME = process.env.LAZY_ENGINE_NAME;
const LAZY_ENGINE_URL = process.env.LAZY_ENGINE_URL;
const LAZY_ENGINE_SANDBOX_DIR = process.env.LAZY_ENGINE_SANDBOX_DIR;

const nbPassport = require('no-boilerplate-passport');

//  Create directory for our json database.
mkdirp.sync(LAZY_ENGINE_SANDBOX_DIR);

const db = low(LAZY_ENGINE_SANDBOX_DIR + '/logins.json', {
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
            baseURL: LAZY_ENGINE_URL,
            providers: {
                github: {
                    config: {
                        clientID: process.env.GITHUB_CLIENT_ID,
                        clientSecret: process.env.GITHUB_CLIENT_SECRET,
                        scope: ['repo', 'admin:repo_hook'],
                        userAgent: 'getlazy.com github-access engine'
                    },
                    callbackURLProperty: 'callbackURL',
                    paths: {
                        //  `start` and `callback` endpoints are defined relative to engine URL
                        //  because we no-boilerplate-passport will create and expose those through
                        //  Passport.
                        start: '/auth/start',
                        callback: '/auth/callback',
                        //  `success` and `failure` endpoints are defined in absolute terms as
                        //  those will be used by no-boilerplate-passport to redirect browser on
                        //  success or failure (we could have defined them relative to lazy service
                        //  rather than engine)
                        success: LAZY_ENGINE_URL + '/auth/success',
                        failure: LAZY_ENGINE_URL + '/auth/failure'
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

        app.get('/auth/success', (req, res) => {
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
