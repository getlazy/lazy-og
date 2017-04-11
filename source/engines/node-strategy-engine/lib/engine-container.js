
'use strict';

/* global logger */

// lazy ignore global-require import/no-dynamic-require

const _ = require('lodash');
const spawn = require('cross-spawn');
const yarnInstall = require('yarn-install');
const EngineHelpers = require('@getlazy/engine-helpers');

const EngineHttpServer = EngineHelpers.EngineHttpServer;

class EngineContainerHttpServer extends EngineHttpServer {

    constructor(port, config) {
        super(port);
        this._config = _.get(config, 'packageConfig', {});

        // NPM_TOKEN is read from the environment because it shouldn't be hard-coded in the config
        // due to security concerns.
        const npmToken = _.get(process.env, 'NPM_TOKEN', 'public');
        const npmRegistry = _.get(config, 'npmRegistry', 'registry.npmjs.org');
        if (_.eq(npmToken, 'public')) {
            process.env.NPM_TOKEN = npmToken;
            process.env.NPM_AUTH_TOKEN = npmToken;
        } else {
            // This a hack: if user has configured npm token (and optionally registry)
            // the only way we can tell npm (or yarn) to use it is to configure it
            // through CLI.
            const configResult = spawn.sync('npm', ['config', 'set', `//${npmRegistry}/:_authToken`, npmToken], {
                stdio: 'ignore' // ignore stdio to avoid dumping npmToken to logs!
            });
            if (configResult.status !== 0) {
                this._engine = {};
                throw new Error(`npm config failed with ${configResult.status}`);
            }
        }
        // Download the package thet implements the engine
        const packageNPM = _.get(config, 'packageNPM');
        const packageVersion = _.get(config, 'packageVersion');
        let enginePackage;
        if (!_.isEmpty(packageVersion)) {
            enginePackage = `${packageNPM}@${packageVersion}`;
        } else {
            enginePackage = packageNPM;
        }

        logger.info('Downloading and installing package:', enginePackage);
        const spawnSyncResult = yarnInstall([enginePackage]);
        if (spawnSyncResult.status !== 0) {
            this._engine = {};
            throw new Error(`yarn failed with ${spawnSyncResult.status}`);
        }
        this._engine = require(packageNPM);
    }

    beforeListening() {
        try {
            return this._engine.configure(this._config);
        } catch (error) {
            return Promise.reject(error);
        }
    }
    afterListening() {
        try {
            return this._engine.shutDown();
        } catch (error) {
            return Promise.reject(error);
        }
    }

    /**
     * Analyzes the given file content for the given language and analysis configuration.
     * @param {string} hostPath Path of the source file requesting lazy to analyze.
     * @param {string} language Language of the source file.
     * @param {string} content Content of the source file requesting lazy to analyze.
     * @param {string} context Context information included with the request.
     * @return {Promise} Promise resolving with results of the file analysis.
     */
    analyzeFile(hostPath, language, content, context) {
        try {
            return this._engine.handleRequest(hostPath, language, content, context);
        } catch (error) {
            return Promise.reject(error);
        }
    }

    getMeta() {
        try {
            return this._engine.getMeta();
        } catch (error) {
            logger.error(error);
            return null;
        }
    }
}

class Engine {
    constructor(engineConfig) {
        // get the port to listen on
        const port = process.env.PORT || 80;
        this._server = new EngineContainerHttpServer(port, engineConfig);
    }

    start() {
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
