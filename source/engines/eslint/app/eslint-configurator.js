'use strict';

const _ = require('lodash');
const selectn = require('selectn');
const fs = require('fs');
const yaml = require('js-yaml');
const npmi = require('npmi');
const process = require('process');

class EslintConfigurator {

    /**
     * Load and process YAML configuration file
     * @param {string} filePath YAML file path
     * @return {Promise} Promise that is resolved when the YAML file
     *                   is processed.
     */
    static loadYaml(filePath) {
        logger.info('Loading configration from', filePath);
        return new Promise((resolve, reject) => {
            fs.readFile(filePath, 'utf8', (err, content) => {
                if (err) {
                    return reject(err);
                }
                resolve(yaml.safeLoad(content));
            });
        });
    }

    /**
     * Import a single rule set defined in the configuration
     * @param {object} configRuleSet A rule-set object.
     * @return {Promise} Promise that is resolved when the rule set is processed
     *                   (including the instalation of external NPM's)
     */
    static _importRuleSet(configRuleSet) {
        const ruleSet = _.cloneDeep(configRuleSet);
        const rsName = selectn('rule-set', ruleSet);

        // If there is ignore:true in configuration then just skip the whole rule-set
        // Convenient for quick turning on/off of some rule sets
        if (_.eq(ruleSet.ignore, true)) {
            logger.info('Ignoring ruleset:', rsName);
            return Promise.resolve(null);
        }
        logger.info('Importing rule set:', rsName);

        // Some rule sets don't require external packages.
        // Silently acknowledge them
        if (_.isNil(ruleSet.package)) {
            ruleSet.installed = true;
            return Promise.resolve(ruleSet);
        }

        // Process rule sets that require installation of external packages (npm modules)
        // Return the promise that will be resolved when the NPM module is downloaded & installed
        return new Promise((resolve) => {
            const packageName = selectn('package', ruleSet);
            const packageVersion = selectn('package-version', ruleSet) || 'latest';
            const options = {
                name: packageName,
                version: packageVersion,
                // path: '.', // installation path [default: '.']
                forceInstall: false,
                npmLoad: {
                    loglevel: 'silent'
                }
            };

            logger.info('Installing NPM package:', options.name, '@', options.version);
            npmi(options, function (err, result) {
                if (err) {
                    logger.warn(ruleSet.package, 'NPM error', err);
                } else {
                    // installed
                    logger.info('Package', options.name, '@', options.version, 'installed successfully');
                    ruleSet.installed = true;
                }
                resolve(ruleSet);
            });
        });
    }

    /**
     * Process rule sets one by one any invoking onSuccess function for each rule set.
     * @param {object} ruleSets Set of rule sets loaded from configuration
     * @param {function} onSuccess Function to call for each rule set once it is successfully processed
     * @return {Promise} Promise that is resolved when the last rules-set is processed.
     */
    static _installAllRuleSets(ruleSets, onSuccess) {
        return _.reduce(ruleSets, (prom, oneRuleSet) => {
            return prom.then((rSet) => {
                onSuccess(rSet);
                return EslintConfigurator._importRuleSet(oneRuleSet);
            });
        }, Promise.resolve());
    }

    /**
     * Set the environment variables from the passed in set.
     * @param {set} envs Env. variable to set.
     */
    static _setEnvVars(envs) {
        _.forIn(envs, (value, variable) => {
            process.env[variable] = value;
        });
    }

    /**
     * Read the YAML config file and create ESLint configuration based on it.
     * Also, download and install required external NPM modules.
     * @param {string} yamlFilePath YAML file path
     * @return {Promise} Promise that is resolved once the configuration is ready,
     *                   and all required module downloaded & installed
     */
    static configureFromYaml(yamlFilePath) {
        return new Promise((resolve, reject) => {
            EslintConfigurator
                .loadYaml(yamlFilePath)
                .then((eslintConfiguration) => {
                    let rules = {};
                    const plugins = [];

                    // Function to be called after each package is successfully processed.
                    // This function should further configure packages after the installation
                    const onSuccessF = function (ruleSet) {
                        if (_.isNil(ruleSet)) {
                            return;
                        }

                        // We need to add plugin to configuration, only if the package
                        // is successfully installed AND if it declares plugin (some packages contain just rules,
                        // like the Google configuration and don't have plugins)
                        if (ruleSet.installed) {
                            if (_.isString(ruleSet.plugin)) {
                                plugins.push(ruleSet.plugin);
                            }

                            // Some packages declare pre-defined set of rules to be included
                            // either as a recommendation or as a full list.
                            // In such cases, we can use this instead of manually listing every rule
                            // defined in a package.
                            const rulesImportStatement = selectn('rules-import', ruleSet);

                            try {
                                if (_.isString(rulesImportStatement)) {
                                    rules = _.extend(rules,
                                        selectn(rulesImportStatement, require(ruleSet.package))
                                    );
                                }
                            } catch (err) {
                                logger.warn('Cannot install package: ', ruleSet.package, err);
                            }

                            // Process rules that may be configured manually
                            if (!_.isNil(ruleSet.rules)) {
                                rules = _.extend(rules, ruleSet.rules);
                            }
                        }
                    };

                    // Set env vars defined in yaml configuration
                    // In future, add other configuration options, if needed.
                    const envs = selectn('env-vars', eslintConfiguration);

                    EslintConfigurator._setEnvVars(envs);

                    // Process all declared rule sets. A rule set may involve installing
                    // remote NPM packages
                    const packs = selectn('rule-sets', eslintConfiguration);

                    EslintConfigurator._installAllRuleSets(packs, onSuccessF)
                        .then((lastRuleSet) => {
                            onSuccessF(lastRuleSet);
                            logger.info('Finished installation of packages.');
                            resolve({
                                'rules': rules,
                                'plugins': plugins
                            });
                        });
                })
                .catch((err) => {
                    reject(err);
                });
        });
    }
}

module.exports = EslintConfigurator;
