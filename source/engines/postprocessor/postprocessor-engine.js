'use strict';

// lazy ignore class-methods-use-this
// lazy ignore no-cond-assign
// lazy ignore no-plusplus

const _ = require('lodash');
const EngineHelpers = require('@lazyass/engine-helpers');

const EngineHttpServer = EngineHelpers.EngineHttpServer;
const wooHoo = {
    type: 'Info',
    message: 'Woo-hoo! No linter warnings - your code looks pretty nice.',
    ruleId: 'Congrats',
    line: 1,
    column: 1
};

class PostProcEngineHttpServer extends EngineHttpServer {

    /**
     * Parse the single line looking for lazy directives
     * Lazy directive can be in form of single line or
     * block comment - for example:
     *  / * lazy ignore <rule-id> * /
     * or
     *  // lazy ignore <rule-id>
     * @param {string} line Single line of the source file
     * @return {Object} Command object
     */
    _parseLine(line) {
        const regex = /(#|\/\*|\/\/)\W*lazy\s*(\S*)\s*(\S*).*/g;
        const command = {
            commandStr: '',
            argStr: ''
        };

        let m;
        while ((m = regex.exec(line)) !== null) {
            // This is necessary to avoid infinite loops with zero-width matches
            if (m.index === regex.lastIndex) {
                regex.lastIndex++;
            }
            const commandStr = m[2]; // Command
            const argStr = m[3]; // Argument

            if (!_.isEmpty(commandStr)) {
                command.commandStr = commandStr;
                command.argStr = argStr;
            }
        }
        return command;
    }

    /**
     * Parses the source code looking for lazy directives in comments
     * @param {string} content Content of the source file
     * @return {Object} List of all directives found in comments
     */
    _getLazyDirectives(content) {
        const self = this;
        const lines = _.split(content, '\n');
        const directives = {
            ignore: []
        };

        _.forEach(lines, (oneLine) => {
            const command = self._parseLine(oneLine);
            if (_.eq(command.commandStr, 'ignore')) {
                if (!_.isEmpty(command.argStr)) {
                    directives.ignore.push(_.toLower(command.argStr));
                }
            }
        });
        return directives;
    }

    /**
     * Remove all messages that should be removed
     * @param {Object} warningList List of messages from which to remove warnings
     * @param {Object} toRemove List of ruleId's to remove from warningList
     * @return {Object} Filtered list of messages
     */
    _removeWarnings(warningList, toRemove) {
        const resultWarnings = _.cloneDeep(warningList);

        _.remove(resultWarnings, (warning) => {
            const ruleId = _.get(warning, 'ruleId');
            if (_.isNil(ruleId)) {
                return false;
            }
            return _.includes(toRemove, _.toLower(ruleId));
        });
        return resultWarnings;
    }

    /**
     * Analyzes the previous engine's messages that are passed in context,
     * and post process them according to directives found in content
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
                    warnings: [wooHoo]
                });
            }
            const directives = self._getLazyDirectives(content);

            const filteredWarnings = self._removeWarnings(prevWarnings, directives.ignore);

            if (_.size(filteredWarnings) < 1) {
                filteredWarnings.push(wooHoo);
            }
            resolve({
                warnings: filteredWarnings
            });
        });
    }

    getMeta() {
        return {
            languages: ['JavaScript', 'JSON', 'YAML', 'HTML', 'C', 'C++', 'Objective-C', 'Objective-C++', 'CSS', 'SCSS', 'LESS', 'SugarCSS', 'PHP', 'Java']
        };
    }
}

class Engine {
    start() {
        const port = process.env.PORT || 80;
        this._server = new PostProcEngineHttpServer(port);
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
