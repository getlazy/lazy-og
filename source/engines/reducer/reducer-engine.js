'use strict';

// lazy ignore class-methods-use-this
// lazy ignore lodash/chaining ; We actually love using chaining...

const _ = require('lodash');
const EngineHelpers = require('@lazyass/engine-helpers');

const EngineHttpServer = EngineHelpers.EngineHttpServer;

class ReducerEngineHttpServer extends EngineHttpServer {

    _reduceWarnings(allWarnings, maxWarningsPerRule, maxWarningsPerFile) {
        const allEnginesResults = {
            warnings: []
        };

        //  Reduce the number of warnings per max warnings per rule and max warnings
        //  settings.
        const reducedWarnings = _(allWarnings)
            .groupBy('ruleId')
            .mapValues((warnings, ruleId) => {
                if (!_.isNumber(maxWarningsPerRule) ||
                    warnings.length <= maxWarningsPerRule ||
                    ruleId === 'undefined') {
                    return warnings;
                }
                const firstWarning = _.head(_.sortBy(warnings, 'line'));

                //  Use the first warning plus an info on the same line with the number
                //  of warnings left for the same rule.
                return [firstWarning, _.assignIn(_.clone(firstWarning), {
                    type: 'Info',
                    message: `+ ${warnings.length - 1} other warnings of [${ruleId}] rule`
                })];
            })
            .flatMap()
            //  If max warnings is defined then limit the number of warnings.
            .take(_.isNumber(maxWarningsPerFile) ? maxWarningsPerFile : allEnginesResults.warnings.length)
            .value();
        allEnginesResults.warnings = reducedWarnings;
        return allEnginesResults;
    }

    /**
     * Analyzes the previous engine's messages that are passed in context,
     * and reduces their number by removing duplicate rule-ids and limiting
     * total number of warnings per file
     * @param {string} hostPath Path of the source file requesting lazy to analyze.
     * @param {string} language Language of the source file.
     * @param {string} content Content of the source file requesting lazy to analyze.
     * @return {Promise} Promise resolving with results of the file analysis.
     */
    analyzeFile(hostPath, language, content, context) {
        const self = this;

        //  We use a promise as we get any exceptions wrapped up as failures.
        return new Promise((resolve) => {
            const prevWarnings = _.get(context, 'previousStepResults.warnings');
            if (_.isNil(prevWarnings)) { // nothing from the previos engines
                resolve({
                    warnings: []
                });
            }
            const maxWarningsPerRule = _.parseInt(_.get(context, 'engineParams.maxWarningsPerRule', 4));
            const maxWarningsPerFile = _.parseInt(_.get(context, 'engineParams.maxWarningsPerFile', 200));
            const reducedWarnings = self._reduceWarnings(prevWarnings, maxWarningsPerRule, maxWarningsPerFile);

            resolve(reducedWarnings);
        });
    }

    getMeta() {
        return {
            languages: []
        };
    }
}

class Engine {
    start() {
        const port = process.env.PORT || 80;
        this._server = new ReducerEngineHttpServer(port);
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
