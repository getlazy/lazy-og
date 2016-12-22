
'use strict';

global.logger = require('@lazyass/engine-helpers').Logger.getEngineLogger();

const _ = require('lodash');
const selectn = require('selectn');

const EngineHelpers = require('@lazyass/engine-helpers');
const EngineHttpServer = EngineHelpers.EngineHttpServer;

//  TODO: Merge StylelintEngine, StylelintEngineHttpServer and Engine classes - their
//  separation doesn't make much sense.

class StylelintEngine
{
    constructor() {
        this._stylelint = require('stylelint');
        this._stylelintConfigStandard = require('stylelint-config-standard');
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
    analyzeFile(hostPath, language, content, context) {
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
            .then((results) => {
                return _
                    .chain(selectn('results[0].warnings', results))
                    .map((warning) => {
                        try {
                            return {
                                type: _.capitalize(warning.severity),
                                //  Remove the rule string from the final output.
                                message: warning.text.replace(' (' + warning.rule + ')', ''),
                                line: _.toNumber(warning.line),
                                column: _.toNumber(warning.column)
                            };
                        } catch(e) {
                            logger.error('Failed to process stylelint warning', warning);
                        }
                    })
                    .filter()
                    .value();
            })
            .then((warnings) => {
                return {
                    warnings: warnings
                };
            });
    }
}

class StylelintEngineHttpServer extends EngineHttpServer
{
    _bootEngine() {
        return Promise.resolve(new StylelintEngine());
    }

    _stopEngine() {
        return Promise.resolve();
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
