
'use strict';

/* global logger */

const _ = require('lodash');
const express = require('express');
const bodyParser = require('body-parser');
const internalControllers = require('./controllers/internal');
const externalControllers = require('./controllers/external');
const EngineManager = require('./engine-manager');

//  Engine manager object managing all the engine containers.
let engineManager = null;
//  Configuration object loaded from the configuration file.
let config = null;
//  ExpressJS app responsible for responding to internal requests.
let internalExpressApp;
//  ExpressJS app responsible for responding to external requests.
let externalExpressApp;

const PRIVATE_API_PORT = 17013;

/**
 * Main lazy process class.
 */
class Main {
    /**
     * Starts the stack by first initializing engines and other services
     * and then starting Express HTTP server.
     * @param {string} lazyYamlFilePath Path to lazy YAML configuration file.
     * @return {Promise} Promise which is resolved when the application has started.
     */
    static main(lazyConfig) {
        logger.info('Starting lazy');

        //  Start procedure is as follows:
        //      1.  Load the configuration and verify it.
        //      2.  Initialize external Express app - it will start listening and returning 503
        //          until the engine manager has been correctly started.
        //      3.  Initialize internal Express app - it will provide engines with configuration
        //          and other services like creating helper containers.
        //      4.  Recreate all the engines. This will stop and delete all the engines running in
        //          this lazy's network and then create then create them anew per the loaded
        //          configuration.
        //      5.  Load all controllers for the external Express app - this step depends on engine
        //          manager correctly started and running which is why we have to wait for step #4
        //          to finish.

        //  Config is the combined preset configuration with overrides from user-defined
        //  configuration.
        config = _.assignIn({
            privateApiPort: PRIVATE_API_PORT
        }, lazyConfig);
        engineManager = new EngineManager(config);

        Main._initializeExternalExpressApp()
            .then(() => Main._initializeInternalExpressApp())
            .then(() => Main._recreateAllEngines())
            .then(() => Main._loadExternalExpressAppControllers())
            .catch((err) => {
                logger.error('Failed to boot lazy', { err: err && err.toString() });
                return Main.stop()
                    .then(() => {
                        process.exit(-1);
                    })
                    .catch((stopErr) => {
                        logger.error('Failed to cleanup after lazy', { err: stopErr }, () => {
                            process.exit(-2);
                        });
                    });
            });
    }

    /**
     * Stops the running engine manager which in turn stops and destroys all the running engines
     * but not lazy network nor the shared volume.
     * @return {Promise} Promise resolving when engine manager has finished stopping.
     */
    static stop() {
        if (!engineManager) {
            return Promise.resolve();
        }

        return engineManager.stop();
    }

    /**
     * Initialize external Express app that will service requests made to lazy from the inside of
     * lazy network (e.g. engines)
     * @return {Promise} Promise which is resolved when Express app has been initialized.
     * @private
     */
    static _initializeInternalExpressApp() {
        internalExpressApp = express();
        internalExpressApp.use(bodyParser.json());

        return internalControllers.initialize(internalExpressApp, { config, engineManager })
            .then(() => new Promise((resolve, reject) => {
                internalExpressApp.listen(PRIVATE_API_PORT, (err) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    logger.info('lazy listening to internal requests on', { port: PRIVATE_API_PORT });
                    resolve();
                });

                internalExpressApp.on('error', (err) => {
                    logger.error('Internal ExpressJS app error', { err: err && err.toString() });
                });
            }));
    }

    /**
     * Sends 503 HTTP status if server is not ready.
     */
    static _middleware503IfNotReady(req, res, next) {
        if (engineManager && engineManager.isRunning) {
            next();
            return;
        }

        //  Send service unavailable with an arbitrary length of Retry-After header.
        //  This allows lazy service running this engine to gracefully handle the case.
        const ARBITRARY_SERVICE_UNAVAILABLE_RETRY_AFTER = 5/* seconds */;
        res.setHeader('Retry-After', ARBITRARY_SERVICE_UNAVAILABLE_RETRY_AFTER);
        res.sendStatus(503);
    }

    /**
     * Initialize external Express app that will service requests made to lazy from the outside
     * world.
     * @return {Promise} Promise which is resolved when the Express app has been initialized.
     * @private
     */
    static _initializeExternalExpressApp() {
        externalExpressApp = express();
        externalExpressApp.use(bodyParser.json());
        //  Return 503 until lazy is ready.
        externalExpressApp.use(Main._middleware503IfNotReady);

        //  Start listening on external port. We cannot immediately load external controllers
        //  as we need engineManager started and running for that.
        return new Promise((resolve, reject) => {
            const port = process.env.PORT || process.env.LAZY_EXTERNAL_PORT || 80;
            externalExpressApp.listen(port, (err) => {
                if (err) {
                    reject(err);
                    return;
                }

                logger.info('lazy listening', { port });
                resolve();
            });

            externalExpressApp.on('error', (err) => {
                logger.error('Extenal ExpressJS app error', { err: err && err.toString() });
            });
        });
    }

    /**
     * @private
     */
    static _loadExternalExpressAppControllers() {
        return externalControllers.initialize(externalExpressApp, { engineManager, config });
    }

    /**
     * Recreate all engines based on the given configuration.
     * @private
     */
    static _recreateAllEngines() {
        return engineManager.start();
    }
}

module.exports = Main;
