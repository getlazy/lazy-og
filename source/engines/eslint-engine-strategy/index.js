
'use strict';

/* global logger */

const _ = require('lodash');
const CLIEngine = require('eslint').CLIEngine;
const yarnInstall = require('yarn-install');
const getRuleURI = require('eslint-rule-documentation');

let availablePlugins;

// lazy ignore arrow-body-style

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

            if (!_.isEmpty(packages)) {
                logger.info('Downloading and installing packages:', packages);
                const spawnSyncResult = yarnInstall(packages);
                if (spawnSyncResult.status !== 0) {
                    reject(new Error(`yarn failed with ${spawnSyncResult.status}`));
                    return;
                }
            }
        }

        resolve({
            installedPlugins
        });
    });
};

const _getEslintCli = (eslintConfig, configFiles) => {
    // ESLint config from the files has the precedence over the one configured in lazy.
    const eslintrcFile = _.find(configFiles, configFile => configFile.name === '.eslintrc');
    if (eslintrcFile) {
        return eslintrcFile.config;
    }
    if (_.isObject(eslintrcFile) && _.isObject(eslintrcFile.config)) {
        eslintConfig = eslintrcFile.config;
    }

    return new CLIEngine({
        envs: _.get(eslintConfig, 'env', ['node', 'es6']),
        parser: _.get(eslintConfig, 'parser', 'babel-eslint'),
        plugins: availablePlugins,
        rules: _.get(eslintConfig, 'rules', {}),
        fix: false,
        parserOptions: _.get(eslintConfig, 'parserOptions', {
            ecmaVersion: 7
        })
    });
};

module.exports = {
    configure(config) {
        return _configure(config)
            .then((cfg) => {
                availablePlugins = cfg.installedPlugins;
            });
    },

    shutDown() {
        return Promise.resolve();
    },

    handleRequest(hostPath, language, content, context) {
        const eslintConfig = _.get(context, 'engineParams.config', {});
        const configFiles = _.get(context, 'configFiles');

        // HACK: Skip ESLint if there is a jshintrc config file. We do the same in JSHint engine
        // which means that if both of these files are included, neither ESLint nor JSHint will be run.
        // However (another hack level) we currently collect only one configuration file.
        if (_.some(configFiles, configFile => configFile.name === '.jshintrc')) {
            return Promise.resolve([]);
        }

        return new Promise((resolve) => {
            const res = _getEslintCli(eslintConfig, configFiles).executeOnText(content, hostPath);
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

    getMeta() {
        return {
            languages: ['JavaScript']
        };
    }
};
