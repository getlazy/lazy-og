
'use strict';

const _ = require('lodash');
const jshint = require('jshint').JSHINT;

const processResults = (result) => {
    _.each(result.errors, (error) => {
      if (!error.id) {
        return;
      }

      const errorType = error.code.substr(0, 1);
      let type = 'Info';
      if (errorType === 'E') {
        type = 'Error';
      } else if (errorType === 'W') {
        type = 'Warning';
      }
      const errorLine = error.line > 0 ? error.line - 1 : 0;
      let range;

      // TODO: Remove workaround of jshint/jshint#2846
      if (error.character === null) {
        range = Helpers.generateRange(textEditor, errorLine);
      } else {
        let character = error.character > 0 ? error.character - 1 : 0;
        let line = errorLine;
        const buffer = textEditor.getBuffer();
        const maxLine = buffer.getLineCount();
        // TODO: Remove workaround of jshint/jshint#2894
        if (errorLine >= maxLine) {
          line = maxLine;
        }
        const maxCharacter = buffer.lineLengthForRow(line);
        // TODO: Remove workaround of jquery/esprima#1457
        if (character > maxCharacter) {
          character = maxCharacter;
        }
        range = Helpers.generateRange(textEditor, line, character);
      }

      results.push({
        type,
        text: `${error.code} - ${error.reason}`,
        filePath,
        range,
      });
    });
    return results;
};

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
            return Promise.resolve([]);
        }

        // JSHint config from the files has the precedence over the one configured in lazy.
        const jshintrcFile = _.find(configFiles, configFile => configFile.name === '.jshintrc');
        if (_.isObject(jshintrcFile) && _.isObject(jshintrcFile.config)) {
            jshintConfig = jshintrcFile.config;
        }

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

        return new Promise((resolve) => {
            jshint(content, jshintConfig, _.get(jshintConfig, 'globals'));
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
