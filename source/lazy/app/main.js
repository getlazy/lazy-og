
'use strict';

//  Initialize all global variables.
global.logger = require('./logger');

const express = require('express');
const bodyParser = require('body-parser');

const EngineManager = require('./engine-manager');

//  Engine manager object managing all the engine containers.
let engineManager = null;

let app;

const LazyYamlFile = require('./lazy-yaml-file');

class Main
{
    /**
     * Starts the stack by first initializing engines and other services
     * and then starting Express HTTP server.
     * @return {Promise} Promise which is resolved when the application has started.
     */
    static main(lazyYamlFilePath) {
        logger.info('Booting lazy');

        return Main._recreateAllEngines(lazyYamlFilePath || (__dirname + '/../lazy.yaml'))
            .then(Main._initializeExpressApp)
            .catch((err) => {
                logger.error('Failed to boot lazy', err);
                return Main.stop()
                    .then(() => {
                        process.exit(-1);
                    })
                    .catch((err) => {
                        logger.error('Failed to cleanup after lazy', err);
                        process.exit(-2);
                    });
            });
    }

    static stop() {
        if (!engineManager) {
            return Promise.resolve();
        }

        return engineManager.stop();
    }

    static _initializeExpressApp() {
        app = express();
        app.use(bodyParser.json());

        return require('./controllers').initialize(app, {
            engineManager: engineManager
        })
            .then(() => {
                return new Promise((resolve) => {
                    const port = process.env.PORT || 80;
                    app.listen(port, () => {
                        logger.info('lazy listening on', port);
                        resolve();
                    });

                    app.on('error', (err) => {
                        logger.error('Express error', err);
                    });
                });
            });
    }

    static _recreateAllEngines(lazyYamlFilePath) {
        return LazyYamlFile.load(lazyYamlFilePath)
            .then((lazyConfig) => {
                engineManager = new EngineManager(lazyConfig);
                return engineManager.start();
            });
    }
}

module.exports = Main;
