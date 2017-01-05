
'use strict';

/* global logger */

//  Initialize all global variables.
global.logger = require('./logger');

const express = require('express');
const bodyParser = require('body-parser');
const internalControllers = require('./controllers/internal');
const externalControllers = require('./controllers/external');
const EngineManager = require('./engine-manager');
const LazyYamlFile = require('./lazy-yaml-file');

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
class Main
{
    /**
     * Starts the stack by first initializing engines and other services
     * and then starting Express HTTP server.
     * @param {string} lazyYamlFilePath Path to lazy YAML configuration file.
     * @return {Promise} Promise which is resolved when the application has started.
     */
    static main(lazyYamlFilePath) {
        logger.info('Starting lazy');

        return Main._loadLazyYaml(lazyYamlFilePath)
            .then((lazyConfig) => {
                config = lazyConfig;
                engineManager = new EngineManager(lazyConfig);
            })
            .then(() => Main._initializeInternalExpressApp(config))
            .then(() => Main._recreateAllEngines(config))
            .then(() => Main._initializeExternalExpressApp(config))
            .catch((err) => {
                logger.error('Failed to boot lazy', err);
                return Main.stop()
                    .then(() => {
                        process.exit(-1);
                    })
                    .catch((stopErr) => {
                        logger.error('Failed to cleanup after lazy', stopErr);
                        process.exit(-2);
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

                    logger.info('lazy listening to internal requests on', PRIVATE_API_PORT);
                    resolve();
                });

                internalExpressApp.on('error', (err) => {
                    logger.error('Internal ExpressJS app error', err);
                });
            }));
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

        return externalControllers.initialize(externalExpressApp, { engineManager, config })
            .then(() => new Promise((resolve, reject) => {
                const port = process.env.PORT || process.env.LAZY_EXTERNAL_PORT || 80;
                externalExpressApp.listen(port, (err) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    logger.info('lazy listening on', port);
                    resolve();
                });

                externalExpressApp.on('error', (err) => {
                    logger.error('Extenal ExpressJS app error', err);
                });
            }));
    }

    /**
     * Recreate all engines based on the given configuration.
     * @private
     */
    static _recreateAllEngines(lazyConfig) {
        return engineManager.start();
    }

    static _loadLazyYaml(lazyYamlFilePath) {
        return LazyYamlFile.load(lazyYamlFilePath || `${__dirname}/../lazy.yaml`);
    }
}

module.exports = Main;
