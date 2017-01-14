'use strict';

// lazy ignore class-methods-use-this

const _ = require('lodash');
const EngineHelpers = require('@lazyass/engine-helpers');

const EngineHttpServer = EngineHelpers.EngineHttpServer;
const wooHoo = {
    type: 'Info',
    message: '',
    ruleId: ' lazy-no-linter-warnings '
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
        // lazy ignore-once no-useless-escape ; Linter is confused w/ regex
        const regex = /(#|\/\*|\/\/)\W*lazy\s+(\S*)\s*([^;\*]*)\s*;*(.*)/g;

        const command = {
            commandStr: '',
            args: [],
            comment: ''
        };

        let m;
        while ((m = regex.exec(line)) !== null) { // lazy ignore-once no-cond-assign ; This is standard regex usage
            // This is necessary to avoid infinite loops with zero-width matches
            if (m.index === regex.lastIndex) {
                regex.lastIndex++; // lazy ignore-once no-plusplus ; What's wrong with plusplus, anyway?
            }
            const commandStr = _.get(m, '[2]', '');

            if (!_.isEmpty(commandStr)) {
                command.commandStr = commandStr;
                command.args = _.words(_.get(m, '[3]', ''), /\S+/g);
                command.comment = _.get(m, '[4]', ''); // comments (after ;)
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
            ignore: [],
            ignore_once: [],
            ignore_local: []
        };

        _.forEach(lines, (oneLine, lineNo) => {
            const command = self._parseLine(oneLine);

            if (_.eq(command.commandStr, 'ignore')) {
                if (_.isEmpty(command.args)) {
                    // if there are no args, then treat this as
                    // "ignore all warnings at this line"
                    directives.ignore_local.push(lineNo + 1);
                } else {
                    // lazy ignore-once lodash/prefer-map ; _.map with be more complicated in this case
                    _.forEach(command.args, (ruleToIgnore) => {
                        directives.ignore.push(_.toLower(ruleToIgnore));
                    });
                }
            }

            if (_.eq(command.commandStr, 'ignore-once')) {
                // lazy ignore-once lodash/prefer-map  ; map with be more complicated in this case
                _.forEach(command.args, (ruleToIgnore) => {
                    directives.ignore_once.push({
                        line: lineNo + 1,   // lineNo is zero based in forEach
                        ruleId: _.toLower(ruleToIgnore)
                    });
                });
            }
        });
        return directives;
    }

    /**
     * Remove all messages that should be globally ignored
     * @param {Object} warningList List of messages from which to remove warnings
     * @param {Object} toRemove List of ruleId's to remove from warningList
     * @return {Object} Filtered list of messages
     */
    _removeIgnoreWarnings(warningList, toRemove) {
        _.remove(warningList, (warning) => {
            const ruleId = _.get(warning, 'ruleId');
            if (_.isNil(ruleId)) {
                return false;
            }
            return _.includes(toRemove, _.toLower(ruleId));
        });
        return warningList;
    }

    /**
     * Remove all messages that should be ignored in current line, only
     * @param {Object} warningList List of messages from which to remove warnings
     * @param {Object} toRemove List of lines to remove warnings from
     * @return {Object} Filtered list of messages
     */
    _removeLocalWarnings(warningList, toRemove) {
        const processedLines = [];

        _.pullAllWith(warningList, toRemove, (warning, directiveLine) => {
            const warningLine = _.parseInt(_.get(warning, 'line', 0), 10);
            if (_.eq(warningLine, directiveLine)) {
                processedLines.push(directiveLine);
                return true;
            }
            return false;
        });
        // If there are some lines that are reported for ignorance,
        // but they haven't been reported, mark their ignorance as warning
        // lazy ignore-once lodash/prefer-map ; As we are just adding more warnings, following is more readable.
        _.forEach(_.difference(toRemove, processedLines), (line) => {
            warningList.push({
                type: 'Warning',
                message: 'No rules violated at this line.',
                ruleId: ' lazy-no-ignore-line ',
                line,
                column: 1
            });
        });
        return warningList;
    }

    /**
     * Remove all messages that should be ignored once (only for the first time they occurr)
     * @param {Object} warningList List of messages from which to remove warnings
     * @param {Object} toRemove List of ruleId's to remove from warningList
     * @return {Object} Filtered list of messages
     */
    _removeIgnoreOnceWarnings(warningList, toRemove) {
        const processedDirectives = [];

        _.pullAllWith(warningList, toRemove, (warning, directive) => {
            // Each ignore-once rule should be executed just once,
            if (_.includes(processedDirectives, directive)) {
                return false;
            }
            const warningLine = _.parseInt(_.get(warning, 'line', 0), 10);
            const directiveLine = _.parseInt(_.get(directive, 'line', 0), 10);
            const warningRule = _.toLower(_.get(warning, 'ruleId'));
            const directiveRule = _.toLower(_.get(directive, 'ruleId'));

            if ((_.eq(warningRule, directiveRule)) && (_.gte(warningLine, directiveLine))) {
                // Remember directives we have processed to avoid using them again
                processedDirectives.push(directive);
                return true;
            }
            return false;
        });
        // If there are some rules that are reported for ignorance,
        // but they haven't been reported, mark their ignorance as warning
        // lazy ignore-once lodash/prefer-map ; As we are just adding more warnings, following is more readable.
        _.forEach(_.difference(toRemove, processedDirectives), (warn) => {
            warningList.push({
                type: 'Warning',
                message: `No [${warn.ruleId}] rule violation.`,
                ruleId: ' lazy-no-ignore-once ',
                line: warn.line,
                column: 1
            });
        });
        return warningList;
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
            const filteredWarnings = _.get(context, 'previousStepResults.warnings');
            const wooHooMsgs = _.get(context, 'engineParams.woohoos', ['Woo-hoo! No linter warnings - your code looks pretty nice.']);

            wooHoo.message = _.sample(wooHooMsgs);

            if (_.isNil(filteredWarnings)) { // nothing from the previos engines
                resolve({
                    warnings: [wooHoo]
                });
            }

            const directives = self._getLazyDirectives(content);

            self._removeIgnoreOnceWarnings(filteredWarnings, directives.ignore_once);
            self._removeLocalWarnings(filteredWarnings, directives.ignore_local);
            self._removeIgnoreWarnings(filteredWarnings, directives.ignore);

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
