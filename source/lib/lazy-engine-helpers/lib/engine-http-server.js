
'use strict';

/* global logger */

const _ = require('lodash');
const express = require('express');
const bodyParser = require('body-parser');

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

    get port() {
        // istanbul ignore next
        return this._port;
    }

    start() {
        return this._initializeExpressApp();
    }

    stop() {
        //  Immediately mark the server as not ready to prevent any stray requests being served.
        this._isReady = false;

        //  Close the server and stop the engine.
        // istanbul ignore else
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
        // istanbul ignore next
        return {};
    }

    /**
     * This function is invoked on POST /file.
     * @return {object}
     */
    analyzeFile() {
        //  Nothing to do.
        // istanbul ignore next
        return Promise.resolve({});
    }

    _initializeExpressApp() {
        // istanbul ignore if
        if (this._isReady) {
            return Promise.reject(new Error('Engine HTTP server is already running.'));
        }

        //  Setup Express application.
        const app = this._createExpressApp();
        app.use(bodyParser.json());

        //  Middleware that returns 503 if the engine isn't ready to accept requests yet.
        app.use(this._middleware503IfNotReady.bind(this));

        //  GET /status is used by lazy to determine if the engine is healthy.
        app.get('/status', this._endpointGetStatus.bind(this));

        app.get('/meta', this._endpointGetMeta.bind(this));

        //  Listen on POST /file for requests forwarded to us by lazy.
        app.post('/file', this._endpointPostFile.bind(this));

        //  Allow inheriting classes to customize express app.
        this.customizeExpressApp(app);

        //  Finish initialization before we start listening on the port.
        return this.beforeListening()
            .then(() => this._startListening(app))
            .then((httpServer) => {
                //  Capture the HTTP server instance so that we can shut it down on `stop()`
                this._httpServer = httpServer;
                //  HTTP server has booted and engine is now ready to accept requests.
                this._isReady = true;
            })
            .catch((err) => {
                logger.warn(`Failed to listen on port ${this._port}`, err);
                //  We have to cleanup as we have already invoked `beforeListening`.
                return this.afterListening()
                    //  Note that in this case it makes sense to define functions for
                    //  success and failure at the same time as even our success has
                    //  to fail with the original error and chaining them requires
                    //  additional checks.
                    //  Reject the entire promise with the original error.
                    .then(
                        () => Promise.reject(err),
                        (afterListeningErr) => {
                            //  Log the error and reject with the original error as
                            //  there is nothing we can do about this.
                            logger.error('After listening failed', afterListeningErr);
                            return Promise.reject(err);
                        });
            });
    }

    /**
     * Sends 503 HTTP status if server is not ready.
     */
    _middleware503IfNotReady(req, res, next) {
        if (this._isReady) {
            return next();
        }

        //  Send service unavailable with an arbitrary length of Retry-After header.
        //  This allows lazy service running this engine to gracefully handle the case.
        const ARBITRARY_SERVICE_UNAVAILABLE_RETRY_AFTER = 5/* seconds */;
        res.setHeader('Retry-After', ARBITRARY_SERVICE_UNAVAILABLE_RETRY_AFTER);
        res.sendStatus(503);
    }

    _endpointGetStatus(req, res) {
        //  Return 200. The above middleware will return 503 if engine is still not ready.
        // istanbul ignore next
        res.sendStatus(200);
    }

    _endpointGetMeta(req, res) {
        // istanbul ignore next
        res.send(this.getMeta());
    }

    _endpointPostFile(req, res) {
        const hostPath = _.get(req, 'body.hostPath');
        const language = _.get(req, 'body.language');
        const content = _.get(req, 'body.content');
        const context = _.get(req, 'body.context');

        return this.analyzeFile(hostPath, language, content, context)
            .then((results) => {
                res.send(results);
            })
            .catch((err) => {
                logger.info(err);
                res.status(500).send({
                    error: err.message
                });
            });
    }

    _startListening(app) {
        return new Promise((resolve, reject) => {
            const httpServer = app.listen(this.port, (err) => {
                if (err) {
                    return reject(err);
                }

                //  httpServer is undefined if this is executed synchronously (like in tests)
                return setImmediate(() => {
                    resolve(httpServer);
                });
            });
        });
    }

    _createExpressApp() {
        // istanbul ignore next
        return express();
    }
}

module.exports = EngineHttpServer;
