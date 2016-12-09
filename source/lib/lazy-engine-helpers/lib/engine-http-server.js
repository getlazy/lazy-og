
'use strict';

const _ = require('lodash');
const express = require('express');
const bodyParser = require('body-parser');
const selectn = require('selectn');

class EngineHttpServer
{
    constructor(name, port) {
        this._name = name;
        this._port = port;
    }

    setEngine(engine) {
        this._engine = engine;
    }

    start() {
        const self = this;

        if (!_.isUndefined(self._app)) {
            return Promise.resolve(new Error('Engine HTTP server is already running.'));
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
                    logger.error('Linting failed', err);
                    res.status(500).send({
                        error: err.message
                    });
                });
        });

        app.listen(self._port, () => {
            return self._bootEngine()
                .then((engine) => {
                    self._engine = engine;
                    self._app = app;
                    logger.info(self._name, 'listening on', self._port);
                })
                .catch((err) => {
                    logger.error('Failed to correctly boot the engine', err);
                    process.exit(-1);
                });
        });
    }
}

module.exports = EngineHttpServer;
