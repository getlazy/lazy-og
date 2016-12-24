
'use strict';

/* global logger */

const express = require('express');
const bodyParser = require('body-parser');
const selectn = require('selectn');

//  We are implicitly using `this` in overriden methods but eslint keep telling us not to.
/* eslint class-methods-use-this: off */

/**
 * Base class for lazy engine HTTP servers implemented with Express.JS.
 * Parameters of the engine are delegated to inheriting classes through a set of methods that
 * they need to implement. Those methods are: `beforeListening`, `customizeExpressApp`,
 * `afterListening`, `getMeta`.
 */
class EngineHttpServer
{
    constructor(port) {
        this._port = port;
        this._isReady = false;
    }

    get isReady() {
        return this._isReady;
    }

    start() {
        return new Promise(this._initializeExpressApp.bind(this));
    }

    stop() {
        //  Immediately mark the server as not ready to prevent any stray requests being served.
        this._isReady = false;

        //  Close the server and stop the engine.
        if (this._httpServer) {
            this._httpServer.close();
        }
        this._httpServer = null;
        return this.afterListening();
    }

    //  Methods to be overriden by inheriting classes.

    /**
     * This function is invoked immediately before HTTP server starts listening.
     * @return {Promise}
     */
    beforeListening() {
        //  Nothing to do.
        return Promise.resolve();
    }

    /**
     * This function is invoked immediately after HTTP server stops listening.
     * @return {Promise}
     */
    afterListening() {
        //  Nothing to do.
        return Promise.resolve();
    }

    /**
     * This function allows engines to customize the underlying Express app.
     * (e.g. adding new routes, middleware, etc.) It is invoked before `beforeListening`;
     * @param {Express} app Express app object to be customized.
     * @return {undefined}
     */
    customizeExpressApp(/* app */) {
        //  Nothing to do.
    }

    /**
     * This function is invoked on GET /meta.
     * @return {object}
     */
    getMeta() {
        //  Nothing to do.
        return {};
    }

    /**
     * This function is invoked on POST /file.
     * @return {object}
     */
    analyzeFile() {
        //  Nothing to do.
        return Promise.resolve({});
    }

    _initializeExpressApp(resolve, reject) {
        const self = this;

        if (self._isReady) {
            return reject(new Error('Engine HTTP server is already running.'));
        }

        //  Setup Express application.
        const app = express();
        app.use(bodyParser.json());

        //  Middleware that returns 503 if the engine isn't ready to accept requests yet.
        app.use((req, res, next) => {
            if (self._isReady) {
                return next();
            }

            //  Send service unavailable with an arbitrary length of Retry-After header.
            //  This allows lazy service running this engine to gracefully handle the case.
            const ARBITRARY_SERVICE_UNAVAILABLE_RETRY_AFTER = 5/* seconds */;
            res.setHeader('Retry-After', ARBITRARY_SERVICE_UNAVAILABLE_RETRY_AFTER);
            return res.sendStatus(503);
        });

        //  GET /status is used by lazy to determine if the engine is healthy.
        app.get('/status', (req, res) => {
            //  Return 200. The above middleware will return 503 if engine is still not ready.
            res.sendStatus(200);
        });

        app.get('/meta', (req, res) => {
            res.send(self.getMeta());
        });

        //  Listen on POST /file for requests. These requests are not 100% the same as the one
        //  we are receiving in lazy service as language most notably needs to be translated from
        //  the client values into common values.
        app.post('/file', (req, res) => {
            const hostPath = selectn('body.hostPath', req);
            const language = selectn('body.language', req);
            const content = selectn('body.content', req);
            const context = selectn('body.context', req);

            self.analyzeFile(hostPath, language, content, context)
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

        self.customizeExpressApp(app);

        //  Finish initialization before we start listening on the port.
        self.beforeListening()
            .then(() => {
                //  Capture the HTTP server instance so that we can shut it down on `stop()`.
                self._httpServer = app.listen(self._port, (err) => {
                    if (err) {
                        logger.warn(`Failed to listen on port ${self._port}`, err);
                        //  We have to cleanup as we have already invoked `beforeListening`.
                        return self.afterListening()
                            .then(() => {
                                //  Reject the entire promise with the original error.
                                reject(err);
                            })
                            .catch((afterListeningErr) => {
                                //  Log the error and reject with the original error as
                                //  there is nothing we can do about this.
                                logger.error('After listening failed', afterListeningErr);
                                reject(err);
                            });
                    }

                    //  HTTP server has booted and engine is now ready to accept requests.
                    self._isReady = true;
                    return resolve();
                });
            });

        return this._httpServer;
    }
}

module.exports = EngineHttpServer;
