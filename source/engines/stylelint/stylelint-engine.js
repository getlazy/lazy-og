
'use strict';

/* global logger */

global.logger = require('@lazyass/engine-helpers').Logger.getEngineLogger();

const _ = require('lodash');

const EngineHelpers = require('@lazyass/engine-helpers');
const stylelint = require('stylelint');
const stylelintConfigStandard = require('stylelint-config-standard');

const EngineHttpServer = EngineHelpers.EngineHttpServer;

//  We are implicitly using `this` in overriden methods but eslint keep telling us not to.
/* eslint class-methods-use-this: off */
class StylelintEngineHttpServer extends EngineHttpServer
{
    beforeListening() {
        this._stylelint = stylelint;
        this._stylelintConfigStandard = stylelintConfigStandard;
        return Promise.resolve();
    }

    /**
     * Analyzes the given file content for the given language and analysis configuration.
     * @param {string} host Name of the host requesting file analysis.
     * @param {string} hostPath Path of the source file requesting lazy to analyze.
     * @param {string} language Language of the source file.
     * @param {string} content Content of the source file requesting lazy to analyze.
     * @param {string} context Context information included with the request.
     * @return {Promise} Promise resolving with results of the file analysis.
     */
    analyzeFile(hostPath, language, content/* , context*/) {
        const self = this;

        //  Convert lazy language to stylelint language.
        let stylelintLanguage = _.toLower(language);
        if (stylelintLanguage === 'css') {
            stylelintLanguage = 'scss';
        }

        return self._stylelint.lint({
            syntax: stylelintLanguage,
            code: content,
            config: self._stylelintConfigStandard
        })
            .then(results => _
                .chain(_.get(results, ('results[0].warnings')))
                .map((warning) => {
                    try {
                        return {
                            type: _.capitalize(warning.severity),
                            //  Remove the rule string from the final output.
                            message: warning.text,
                            line: _.toNumber(warning.line),
                            column: _.toNumber(warning.column)
                        };
                    } catch (e) {
                        logger.error('Failed to process stylelint warning', warning);
                        return null;
                    }
                })
                .filter()
                .value()
            )
            .then(warnings => ({ warnings }));
    }

    getMeta() {
        return {
            languages: ['CSS', 'SCSS', 'LESS', 'SugarCSS']
        };
    }
}

class Engine
{
    start() {
        const port = process.env.PORT || 80;
        this._server = new StylelintEngineHttpServer(port);
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
