
'use strict';

/* global logger */

const _ = require('lodash');
const jshint = require('jshint').JSHINT;

module.exports = {
    configure(/* config */) {
        return Promise.resolve();
    },

    shutDown() {
        return Promise.resolve();
    },

    handleRequest(hostPath, language, content, context) {
        let jshintConfig = _.get(context, 'engineParams.config', {});
        const configFiles = _.get(context, 'configFiles');

        // HACK: Skip JSHint if there is a jshintrc config file. We do the same in ESLint engine
        // which means that if both of these files are included, neither JSHint nor ESLint will be run.
        // However (another hack level) we currently collect only one configuration file.
        if (_.some(configFiles, configFile => configFile.name === '.eslintrc')) {
            logger.warn('HACK: skipping jshint due to presence of .eslintrc');
            return Promise.resolve([]);
        }

        // JSHint config from the files has the precedence over the one configured in lazy.
        const jshintrcFile = _.find(configFiles, configFile => configFile.name === '.jshintrc');
        if (_.isObject(jshintrcFile) && _.isObject(jshintrcFile.config)) {
            jshintConfig = jshintrcFile.config;
        }

        return new Promise((resolve) => {
            jshint(content, jshintConfig, _.get(jshintConfig, 'globals'));

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
