
'use strict';

process.env.DEBUG = '*';

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
                        //  HACK: Obviously unsafe way to store tokens to access sensitive data.
                        db.get('GitHubLogin')
                            .push({
                                time: Date.now(),
                                token: token,
                                tokenSecret: tokenSecret,
                                profile: profile
                            })
                            .value();

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
