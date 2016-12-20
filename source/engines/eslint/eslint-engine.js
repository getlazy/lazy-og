'use strict';

const _ = require('lodash');
const selectn = require('selectn');
const CLIEngine = require('eslint').CLIEngine;

const EngineHelpers = require('@lazyass/engine-helpers');
const EngineHttpServer = EngineHelpers.EngineHttpServer;

const EslintConfigurator = require('./app/eslint-configurator.js');

class EslintEngine {

    /**
     * Configures the ESlint engine by instatiating CLI with configuration
     * imported from YAML file.
     * @param {string} configFilePath YAML file path.
     * @return {Promise} Promise which is resolved when the config is processed
     *                   and CLI instatiated.
     */
    configure(configFilePath) {
        return new Promise((resolve) => {
            EslintConfigurator
                .configurFromYaml(configFilePath || (__dirname + '/js_rules.yaml'))
                .then((configuration) => {
                    this._cli = new CLIEngine({
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
                    //logger.info(this._cli);
                    resolve(this);
                })
                .catch((err) => {
                    logger.error('Failed to configure ESLint CLI.', err);
                    process.exit(-1);
                });
        });
    }

    /**
     * Analyzes the given file content for the given language and analysis configuration.
     * @param {string} host Name of the host requesting file analysis.
     * @param {string} hostPath Path of the source file requesting lazy to analyze.
     * @param {string} language Language of the source file.
     * @param {string} content Content of the source file requesting lazy to analyze.
     * @param {string} config Name of the configuration to use.
     * @return {Promise} Promise resolving with results of the file analysis.
     */
    analyzeFile(host, hostPath, language, content, config) {
        const self = this;
        //  We use a promise as we get any exceptions wrapped up as failures.
        return new Promise((resolve) => {
            const res = self._cli.executeOnText(content, hostPath);
            const results = _.head(selectn('results', res));
            const messages = selectn('messages', results);

            const warnings = _
                .chain(messages)
                .map((warning) => {
                    return {
                        type: warning.fatal ? 'Error' : 'Warning',
                        message: '['+warning.ruleId + ']: ' + warning.message,
                        line: warning.line,
                        column: warning.column
                    };
                })
                .filter()
                .value();

            resolve({
                warnings: warnings
            });
        });
    }
}

class EslintEngineHttpServer extends EngineHttpServer {
    _bootEngine() {
        return (new EslintEngine()).configure(null);
        // return Promise.resolve(new EslintEngine());
    }

    _stopEngine() {
        return Promise.resolve();
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
