
'use strict';

/* global logger */

const _ = require('lodash');
const EngineHelpers = require('@getlazy/engine-helpers');

const EngineHttpServer = EngineHelpers.EngineHttpServer;

class LocalEngineStrategyProxy extends EngineHttpServer {
    constructor(config, localStrategyPath) {
        const port = process.env.PORT || 80;
        super(port);
        this._config = _.get(config, 'packageConfig', {});
        // lazy ignore-once import/no-dynamic-require global-require
        this._engine = require(localStrategyPath);
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

module.exports = LocalEngineStrategyProxy;
