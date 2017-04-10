'use strict'

/* global logger */

const _ = require('lodash');
const CLIEngine = require('eslint').CLIEngine;
const yarnInstall = require('yarn-install');
const getRuleURI = require('eslint-rule-documentation');

let availablePlugins;

/**
 * Configure ESLint based on the given configuration.
 * Download and install required external NPM modules.
 * @param {Object} eslintConfiguration ESLint configuration.
 * @return {Promise} Promise that is resolved once the configuration is ready,
 *                   and all required module downloaded & installed
 */
const _configure = (eslintConfiguration) => {
    return new Promise((resolve, reject) => {
        const packages = [];
        const installedPlugins = [];
        const rules = {};

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

            logger.info('Downloading and installing packages:', packages);
            const spawnSyncResult = yarnInstall(packages);
            if (spawnSyncResult.status !== 0) {
                reject(new Error(`yarn failed with ${spawnSyncResult.status}`));
                return;
            }
        }
        resolve({
            installedPlugins
        });
    });
};

const _getEslintCli = (localConfig) => {
    return new CLIEngine({
        envs: _.get(localConfig, 'env', ['node', 'es6']),
        parser: _.get(localConfig, 'parser', 'babel-eslint'),
        plugins: availablePlugins,
        rules: _.get(localConfig, 'rules', {}),
        fix: false,
        parserOptions: _.get(localConfig, 'parserOptions', {
            ecmaVersion: 7
        }),
    });
};

module.exports = {
    configure: (config) => {
        return _configure(config)
            .then((cfg) => {
                availablePlugins = cfg.installedPlugins;
            })
    },

    shutDown: () => {
        return Promise.resolve();
    },

    handleRequest: (hostPath, language, content, context) => {
        const localConfig = _.get(context, 'engineParams.config', {});

        return new Promise((resolve) => {
            const res = _getEslintCli(localConfig).executeOnText(content, hostPath);
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

            resolve({
                status: {
                    codeChecked: true
                },
                warnings
            });
        });
    },

    getMeta: () => {
        return {
            languages: ['JavaScript']
        };
    },
};
