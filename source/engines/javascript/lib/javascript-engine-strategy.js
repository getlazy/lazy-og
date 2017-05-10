
'use strict';

/* global logger */

const _ = require('lodash');
const CLIEngine = require('eslint').CLIEngine;
const getRuleURI = require('eslint-rule-documentation');
const jshint = require('jshint').JSHINT;

let availableEslintPlugins;

// lazy ignore arrow-body-style

const LinterType = {
    ESLint: 'eslint',
    JSHint: 'jshint'
};

const ESLINT_CONFIG_FILE_NAME = '.eslintrc';
const JSHINT_CONFIG_FILE_NAME = '.jshintrc';

/**
 * Configure ESLint based on the given configuration.
 * Download and install required external NPM modules.
 * @param {Object} eslintConfiguration ESLint configuration.
 * @return {Promise} Promise that is resolved once the configuration is ready,
 *                   and all required module downloaded & installed
 */
const _configureEslint = (eslintConfiguration) => {
    return new Promise((resolve, reject) => {
        const packages = [];
        const installedPlugins = [];

        const plugins = _.get(eslintConfiguration, 'plugins', []);
        if (!_.isEmpty(plugins)) {
            _.forEach(plugins, (onePlugin) => {
                const packageName = _.get(onePlugin, 'package', '');
                if (!_.isEmpty(packageName)) {
                    const packageVersion = _.get(onePlugin, 'package-version', 'latest');
                    packages.push(`${packageName}@${packageVersion}`);
                }
                const pluginName = _.get(onePlugin, 'name', '');
                if (!_.isEmpty(pluginName)) {
                    installedPlugins.push(pluginName);
                }
            });
        }

        resolve({
            installedPlugins
        });
    });
};

const _configureJshint = (/* eslintConfiguration */) => {
    // Nothing to do for now.
    return Promise.resolve();
};

const _chooseLinter = (engineConfig, configFiles) => {
    // Check if there is anything in config files.
    if (!_.isEmpty(configFiles)) {
        // Good old `for` is by far the best solution here as we can jump out of it as soon as we
        // have a hit.
        let candidatePromise;
        for (let i = 0; i < configFiles.length; ++i) {
            const configFile = configFiles[i];
            switch (_.toLower(configFile.name)) {
                case ESLINT_CONFIG_FILE_NAME:
                    // Since we hit ESLint config which has the highest priority, we immediately
                    // return that solution.
                    return Promise.resolve({ type: LinterType.ESLint, config: configFile.config });
                case JSHINT_CONFIG_FILE_NAME:
                    // Since ESLint has advantage, JSHint configuration is just a candidate.
                    candidatePromise =
                        Promise.resolve({ type: LinterType.JSHint, config: configFile.config });
                    break;
                default:
                    // Nothing to do, continue iterating.
                    break;
            }
        }

        if (candidatePromise) {
            return candidatePromise;
        }
    }

    // Now check if linter is defined in engine config.
    switch (_.toLower(_.get(engineConfig, 'linter'))) {
        case 'eslint':
            return Promise.resolve({ type: LinterType.ESLint, config: engineConfig });
        case 'jshint':
            return Promise.resolve({ type: LinterType.JSHint, config: engineConfig });
        default:
            // Assume that the given engine config, if any, is given for ESLint (default)
            logger.warn('No linter default, using ESLint');
            return Promise.resolve({ type: LinterType.ESLint, config: engineConfig });
    }
};

const _getEslintCli = (config) => {
    return new CLIEngine({
        envs: _.get(config, 'env', ['node', 'es6']),
        parser: _.get(config, 'parser', 'babel-eslint'),
        plugins: availableEslintPlugins,
        rules: _.get(config, 'rules', {}),
        fix: false,
        parserOptions: _.get(config, 'parserOptions', {
            ecmaVersion: 7
        })
    });
};

const _runEslint = (config, content, hostPath) => {
    return new Promise((resolve) => {
        const res = _getEslintCli(config).executeOnText(content, hostPath);
        const results = _.head(_.get(res, 'results'));
        const messages = _.get(results, 'messages');

        const warnings = _
            .chain(messages)
            .map((warning) => {
                const rWarning = {
                    type: _.eq(warning.severity, 2) ? 'Error' : 'Warning',
                    message: `[${warning.ruleId}]: ${warning.message}`,
                    ruleId: warning.ruleId,
                    line: warning.line,
                    column: warning.column
                };

                if (!_.isNull(warning.ruleId)) {
                    const ruleDocs = getRuleURI(warning.ruleId);
                    const moreInfoUrl = (ruleDocs.found) ? ruleDocs.url : `https://www.google.com/search?q=${warning.ruleId}`;
                    rWarning.moreInfo = moreInfoUrl;
                }

                rWarning.fix = _.get(warning, 'fix', {});
                return rWarning;
            })
            .filter()
            .value();

        resolve(warnings);
    });
};

const _runJshint = (config, content) => {
    return new Promise((resolve) => {
        jshint(content, config, _.get(config, 'globals'));

        const warnings = _(_.get(jshint.data(), 'errors'))
            .map((warning) => {
                const lazyWarning = {
                    type: 'Error',
                    message: `[${warning.code}]: ${warning.reason}`,
                    ruleId: warning.code,
                    line: warning.line,
                    column: warning.character
                };

                if (!_.isNil(warning.code)) {
                    const moreInfoUrl = `https://www.google.com/search?q=jshint&${warning.code}`;
                    lazyWarning.moreInfo = moreInfoUrl;
                }

                return lazyWarning;
            })
            .filter()
            .value();

        resolve(warnings);
    });
};

module.exports = {
    configure(config) {
        return _configureEslint(_.get(config, 'eslint'))
            .then((resolvedConfig) => {
                availableEslintPlugins = resolvedConfig.installedPlugins;
                return _configureJshint(_.get(config, 'jshint'));
            });
    },

    shutDown() {
        return Promise.resolve();
    },

    handleRequest(hostPath, language, content, context) {
        const engineConfig = _.get(context, 'engineParams.config', {});
        const configFiles = _.get(context, 'configFiles');

        // Choose if we should execute ESLint *OR* JSHint but never both.
        // The advantage is with configuration files and then with engine configuration
        // and finally if there is none then we default to ESLint and its js-standard configuration.
        return _chooseLinter(engineConfig, configFiles)
            .then(({ type, config }) => {
                switch (type) {
                    case LinterType.JSHint:
                        return _runJshint(config, content);
                    case LinterType.ESLint:
                    case LinterType.Default:
                    default:
                        return _runEslint(config, content, hostPath);
                }
            })
            .then((warnings) => {
                const metrics = [];
                return {
                    status: {
                        codeChecked: true
                    },
                    warnings,
                    metrics
                };
            });
    },

    getMeta() {
        return {
            languages: ['JavaScript']
        };
    }
};
