
'use strict';

const _ = require('lodash');
const express = require('express');
const bodyParser = require('body-parser');
const selectn = require('selectn');

/**
 * Base class for lazy engine HTTP servers.
 * Parameters of the engine are delegated to inheriting classes through a set of methods that
 * they need to implement. Those methods are: `_bootEngine`, `_stopEngine`.
 */
class EngineHttpServer
{
    constructor(port) {
        this._port = port;
    }

    get engine() {
        return this._engine;
    }

    start() {
        const self = this;

        return new Promise((resolve, reject) => {
            return self._start(resolve, reject);
        });
    }

    _start(resolve, reject) {
        const self = this;

        if (!_.isUndefined(self._engine)) {
            return reject(new Error('Engine HTTP server is already running.'));
        }

        //  Setup Express application.
        const app = express();
        app.use(bodyParser.json());

        //  Middleware that returns 503 if the engine isn't ready to accept requests yet.
        app.use((req, res, next) => {
            if (!_.isUndefined(self._engine)) {
                return next();
            }

            //  Send service unavailable with an arbitrary length of Retry-After header.
            //  This allows our running stack to gracefully handle the case.
            const ARBITRARY_SERVICE_UNAVAILABLE_RETRY_AFTER = 5/* seconds */;
            res.setHeader('Retry-After', ARBITRARY_SERVICE_UNAVAILABLE_RETRY_AFTER);
            res.sendStatus(503);
        });

        //  GET /status is used by lazy to determine if the engine is healthy.
        app.get('/status', (req, res) => {
            //  For now just return 200. The above middleware will return 503 if engine is still
            //  not running.
            res.sendStatus(200);
        });

        //  Listen on POST /file for requests. These requests are not 100% the same as the one
        //  we are receiving in lazy service as language most notably needs to be translated from
        //  the client values into common values.
        app.post('/file', (req, res) => {
            const content = selectn('body.content', req);
            const clientPath = selectn('body.clientPath', req);
            const language = selectn('body.language', req);
            const config = selectn('body.config', req);

            self._engine.analyzeFile(content, clientPath, language, config)
                .then((results) => {
                    res.send(results);
                })
                .catch((err) => {
                    logger.info(err);
                    res.status(500).send({
                        error: err.message
                    });
                });
        });

        //  Capture the HTTP server instance so that we can shut it down on `stop()`.
        this._httpServer = app.listen(self._port, () => {
            return self._bootEngine()
                .then((engine) => {
                    //  Engine HTTP server is ready when engine is ready.
                    self._engine = engine;
                    resolve();
                })
                .catch(reject);
        });
    }

    stop() {
        const self = this;

        //  Close the server and stop the engine.
        self._httpServer && self._httpServer.close();
        self._httpServer = null;
        return self._stopEngine()
            .then(() => {
                self._engine = null;
            });
    }
}

module.exports = EngineHttpServer;
