
'use strict';

const _ = require('lodash');
const selectn = require('selectn');

const EngineHelpers = require('@lazyass/engine-helpers');
const EngineHttpServer = EngineHelpers.EngineHttpServer;

class EslintEngine
{
    constructor() {
        var CLIEngine = require("eslint").CLIEngine;
        
        //  Extend the google config with custom options.
        this._eslintConfigGoogle = _.extend(require('eslint-config-google'), {
            envs: ['node', 'es6'],
            parser: 'babel-eslint',
            parserOptions: {
                ecmaVersion: 7
            }
        });
        //  lazy config is a customization of Google config.
        this._eslintLazyConfig = _.cloneDeep(this._eslintConfigGoogle);
        this._eslintLazyConfig.rules = _.extend(this._eslintLazyConfig.rules, {
            'no-console': 2,
            'no-dupe-args': 2,
            'no-dupe-keys': 2,
            'no-unreachable': 2,
            'max-len': [2, {
                code: 100,
                tabWidth: 4,
                ignoreUrls: true
            }],
            'comma-dangle': [2, 'never'],
            'default-case': 2,
            'no-fallthrough': 2,
            'no-implicit-globals': 2,
            //  'no-undef': 2,  //  Removed for now as `config.envs` doesn't seem to work so we get too
            //  spurious warnings on `require`, `Promise` as undeclared globals.
            'no-undefined': 2,
            'no-use-before-define': 2
        });

        this._cli = new CLIEngine({
            envs: ['node', 'es6'],
            parser: 'babel-eslint',
            //plugins: ['lodash'],
            rules: this._eslintLazyConfig.rules,
            fix:false,
            parserOptions: {
                ecmaVersion: 7
            }
        });
    }

    /**
     * Analyzes the given file content for the given language and analysis configuration.
     * @param {string} content Content of the source file requesting lazy to analyze.
     * @param {string} clientPath Path of the source file requesting lazy to analyze.
     * @param {string} language Language of the source file.
     * @param {string} config Name of the configuration to use.
     * @return {Promise} Promise resolving with results of the file analysis.
     */
    analyzeFile(content, clientPath, language, config) {
        const self = this;

        //  We use a promise as we get any exceptions wrapped up as failures.
        return new Promise((resolve) => {
            //const results = self._cli.linter.verify(content, self._getConfig(config));
            const results = _.head(selectn('results',self._cli.executeOnText(content, clientPath)));
            const messages = selectn('messages',results);
            const warnings = _
                .chain(messages)
                .map((warning) => {
                    return {
                        type: warning.fatal ? 'Error' : 'Warning',
                        message: warning.message,
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
/*
    _getConfig(config) {
        switch (_.toLower(config)) {
            case 'google':
                return this._eslintConfigGoogle;
            default:
                return this._eslintLazyConfig;
        }
    };
    */
}

class EslintEngineHttpServer extends EngineHttpServer
{
    _bootEngine() {
        return Promise.resolve(new EslintEngine());
    }

    _stopEngine() {
        return Promise.resolve();
    }
}

class Engine
{
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
