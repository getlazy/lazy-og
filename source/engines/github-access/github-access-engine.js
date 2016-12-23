
'use strict';

const _ = require('lodash');
//  lowdb uses lodash internally but eslint cannot know that.
/* eslint lodash/prefer-lodash-method: off */
const low = require('lowdb');
const LowdbLibFileAsync = require('lowdb/lib/file-async');
const mkdirp = require('mkdirp');
const EngineHelpers = require('@lazyass/engine-helpers');

const EngineHttpServer = EngineHelpers.EngineHttpServer;

const LAZY_ENGINE_URL = process.env.LAZY_ENGINE_URL;
const LAZY_ENGINE_SANDBOX_DIR = process.env.LAZY_ENGINE_SANDBOX_DIR;

const nbPassport = require('no-boilerplate-passport');

/* eslint class-methods-use-this: off */
class GithubAccessEngineHttpServer extends EngineHttpServer
{
    beforeListening() {
        //  Create directory for our json database.
        mkdirp.sync(LAZY_ENGINE_SANDBOX_DIR);

        this._db = low(`${LAZY_ENGINE_SANDBOX_DIR}/logins.json`, {
            storage: LowdbLibFileAsync
        });

        //  Create the schema.
        this._db.defaults({
            GitHubLogin: []
        })
            .value();
    }

    customizeExpressApp(app) {
        const self = this;

        nbPassport(app, {
            version: '1.0.0',
            baseURL: LAZY_ENGINE_URL,
            providers: {
                github2: {
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
                        success: `${LAZY_ENGINE_URL}/auth/success`,
                        failure: `${LAZY_ENGINE_URL}/auth/failure`
                    },
                    handler: (config, token, tokenSecret, profile, done) => {
                        const id = profile && profile.username;

                        //  There is no "update or insert" in lowdb so we have to query and then
                        //  decide if we should insert or update.
                        const login = self._db.get('GitHubLogin')
                            .find({ id })
                            .value();

                        //  HACK: Obviously unsafe way to store tokens to access sensitive data.
                        if (_.isUndefined(login)) {
                            self._db.get('GitHubLogin')
                                .push({
                                    id,
                                    token,
                                    profile,
                                    time: Date.now()
                                })
                                .value();
                        } else {
                            self._db.get('GitHubLogin')
                                .find({ id })
                                .assign({
                                    token,
                                    profile,
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
