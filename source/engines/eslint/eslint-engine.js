
'use strict';

/* global logger */

const _ = require('lodash');
const CLIEngine = require('eslint').CLIEngine;
const EngineHelpers = require('@lazyass/engine-helpers');

const EngineHttpServer = EngineHelpers.EngineHttpServer;
const LazyPrivateApiClient = EngineHelpers.LazyPrivateApiClient;

const EslintConfigurator = require('./app/eslint-configurator.js');

class EslintEngineHttpServer extends EngineHttpServer {
    beforeListening() {
        return this.configure();
    }

    /**
     * Configures the ESlint engine by instatiating CLI with configuration
     * imported from YAML file.
     * @param {string} configFilePath YAML file path.
     * @return {Promise} Promise which is resolved when the config is processed
     *                   and CLI instatiated.
     */
    configure() {
        const self = this;

        const client = new LazyPrivateApiClient();

        return client.getEngineConfig()
            .then(engineConfig => EslintConfigurator.configure(engineConfig.config))
            .then((configuration) => {
                self._cli = new CLIEngine({
                    envs: ['node', 'es6'],
                    parser: 'babel-eslint',
                    plugins: configuration.plugins,
                    rules: configuration.rules,
                    fix: false,
                    parserOptions: {
                        ecmaVersion: 7
                    }
                });
                logger.info('Configured ESLint CLI.');
            })
            .catch((err) => {
                logger.error('Failed to configure ESLint CLI.', err);
                process.exit(-1);
            });
    }

    /**
     * Analyzes the given file content for the given language and analysis configuration.
     * @param {string} hostPath Path of the source file requesting lazy to analyze.
     * @param {string} language Language of the source file.
     * @param {string} content Content of the source file requesting lazy to analyze.
     * @param {string} context Context information included with the request.
     * @return {Promise} Promise resolving with results of the file analysis.
     */
    analyzeFile(hostPath, language, content/*, context*/) {
        const self = this;

        //  We use a promise as we get any exceptions wrapped up as failures.
        return new Promise((resolve) => {
            const res = self._cli.executeOnText(content, hostPath);
            const results = _.head(_.get(res, 'results'));
            const messages = _.get(results, 'messages');

            const warnings = _
                .chain(messages)
                .map((warning) => {
                    return {
                        type: _.eq(warning.severity, 2) ? 'Error' : 'Warning',
                        message: `[${warning.ruleId}]: ${warning.message}`,
                        ruleId: warning.ruleId,
                        line: warning.line,
                        column: warning.column
                    };
                })
                .filter()
                .value();

            resolve({
                warnings
            });
        });
    }

    /* eslint class-methods-use-this: off */
    getMeta() {
        return {
            languages: ['JavaScript', 'Babel ES6 JavaScript']
        };
    }
}

class Engine {
    start() {
        const port = process.env.PORT || 80;
        this._server = new EslintEngineHttpServer(port);
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
