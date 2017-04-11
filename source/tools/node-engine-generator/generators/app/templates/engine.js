
'use strict';

/* global logger */

// lazy ignore class-methods-use-this

const _ = require('lodash'); // lazy ignore-once lodash/import-scope
const EngineHelpers = require('@getlazy/engine-helpers');

const EngineHttpServer = EngineHelpers.EngineHttpServer;
const LazyPrivateApiClient = EngineHelpers.LazyPrivateApiClient;

class LazyEngineHttpServer extends EngineHttpServer {
    /**
     * Configures the engine by getting the configration from Lazy
     * @return {Promise} Promise which is resolved when the engine is configured
     */
    _configure() {
        const self = this;
        const client = new LazyPrivateApiClient();

        return client.getEngineConfig()
            .then((engineConfig) => {
                self._config = engineConfig;
                logger.debug('Engine configured.');
            })
            .catch((err) => {
                logger.error('Failed to configure engine.', err);
                process.exit(-1);
            });
    }

    get config() {
        return this._config;
    }
    /**
     * This function is invoked immediately before HTTP server starts listening.
     * @return {Promise}
     */
    beforeListening() {
        return this._configure();
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
     * @return {Promise}
     */
    analyzeFile(hostPath, language, content, context) {
        return new Promise((resolve) => {
            const engineResponse = {};

            // Get the parameters with which this engine is invoked
            const engineParams = _.get(context, 'engineParams', {});
            logger.debug(engineParams);

            // Get the output of previous engines' executions
            const prevOutput = _.get(context, 'previousStepResults', {});
            logger.debug(prevOutput);

            // do something
            // ...

            // and return response
            resolve(engineResponse);
        });
    }
}

class Engine {
    start() {
        const port = process.env.PORT || 80;
        this._server = new LazyEngineHttpServer(port);
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
