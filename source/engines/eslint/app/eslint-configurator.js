
'use strict';

/* global logger */

const _ = require('lodash');
const fs = require('fs');
const yaml = require('js-yaml');
const npmi = require('npmi');
const process = require('process');

//  Since we might dynamically install npm packages we need to ensure that NPM_TOKEN is set in the
//  environment (see .npmrc in engine's root - this allows dynamic installing private packages)
//  However NPM_TOKEN is and should be optional so if it's not defined we set it to `public` as
//  that's a special value that only allows install of public packages.
if (!process.env.NPM_TOKEN) {
    process.env.NPM_TOKEN = 'public';
}

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

                return resolve(yaml.safeLoad(content));
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
        const rsName = _.get(ruleSet, 'rule-set');

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
            const packageName = _.get(ruleSet, 'package');
            const packageVersion = _.get(ruleSet, 'package-version') || 'latest';
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
        //  Builds a chain of promises importing rule sets. Last rule is resolved and accepted
        //  by the caller.
        return _.reduce(ruleSets, (prom, oneRuleSet) =>
            prom.then((rSet) => {
                onSuccess(rSet);
                return EslintConfigurator._importRuleSet(oneRuleSet);
            }),
            //  Start reducing from a promise resolving to empty.
            Promise.resolve());
    }

    /**
     * Read the YAML config file and create ESLint configuration based on it.
     * Also, download and install required external NPM modules.
     * @param {string} yamlFilePath YAML file path
     * @return {Promise} Promise that is resolved once the configuration is ready,
     *                   and all required module downloaded & installed
     */
    static configureFromYaml(yamlFilePath) {
        return EslintConfigurator
            .loadYaml(yamlFilePath)
            .then(EslintConfigurator.configure);
    }

    /**
     * Configure ESLint based on the given configuration.
     * Download and install required external NPM modules.
     * @param {Object} eslintConfiguration ESLint configuration.
     * @return {Promise} Promise that is resolved once the configuration is ready,
     *                   and all required module downloaded & installed
     */
    static configure(eslintConfiguration) {
        return new Promise((resolve, reject) => {
            let rules = {};
            const plugins = [];

            // Function to be called after each package is successfully processed.
            // This function should further configure packages after the installation
            const onSuccessF = function _onSuccessF(ruleSet) {
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
                    const rulesImportStatement = _.get(ruleSet, 'rules-import');

                    try {
                        if (_.isString(rulesImportStatement)) {
                            rules = _.assignIn(rules,
                                /* eslint import/no-dynamic-require: off */
                                /* eslint global-require: off */
                                _.get(require(ruleSet.package), rulesImportStatement)
                            );
                        }
                    } catch (err) {
                        logger.warn('Cannot install package: ', ruleSet.package, err);
                    }

                    // Process rules that may be configured manually
                    if (!_.isNil(ruleSet.rules)) {
                        rules = _.assignIn(rules, ruleSet.rules);
                    }
                }
            };

            // Process all declared rule sets. A rule set may involve installing
            // remote NPM packages
            const packs = _.get(eslintConfiguration, 'rule-sets');

            EslintConfigurator._installAllRuleSets(packs, onSuccessF)
                .then((lastRuleSet) => {
                    onSuccessF(lastRuleSet);
                    logger.info('Finished installation of packages.');
                    resolve({
                        rules,
                        plugins
                    });
                })
                .catch(reject);
        });
    }
}

module.exports = EslintConfigurator;
