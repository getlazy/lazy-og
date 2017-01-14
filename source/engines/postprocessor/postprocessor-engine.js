'use strict';

// lazy ignore class-methods-use-this

const _ = require('lodash');
const EngineHelpers = require('@lazyass/engine-helpers');

const EngineHttpServer = EngineHelpers.EngineHttpServer;
const wooHoo = {
    type: 'Info',
    message: 'Woo-hoo! No linter warnings - your code looks pretty nice.',
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
        const regex = /(#|\/\*|\/\/)\W*lazy\s+(\S*)\s+([^;\*]*)\s*;*(.*)/g;

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
     * @param {Array} lines Content of the source file, split in lines
     * @return {Object} List of all directives found in comments
     */
    _getLazyDirectives(lines) {
        const self = this;
        const directives = {
            ignore: [],
            ignore_once: []
        };

        _.forEach(lines, (oneLine, lineNo) => {
            const command = self._parseLine(oneLine);

            if (_.eq(command.commandStr, 'ignore')) {
                // lazy ignore-once lodash/prefer-map ; _.map with be more complicated in this case
                _.forEach(command.args, (ruleToIgnore) => {
                    directives.ignore.push(_.toLower(ruleToIgnore));
                });
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
     * Given the lines of source code, and two line numbers,
     * return true if there is nothing except whitespaces between the two
     * given lines
     * @param {Number} fromLine starting line
     * @param {Number} toLine ending line
     * @param {Array} lines array of lines to analyze
     * @return {boolean} true if there is nothin but whitespaces between fromLine and toLine; false otherwise
     */
    _nothingBetweenLines(fromLine, toLine, lines) {
        if (_.eq(toLine, fromLine)) {
            return true; // same line
        }
        if (_.gt(fromLine, toLine)) {
            return false;  // "from" is after "to" line
        }

        // go from fromLine to toLine,
        // and return true if everything in between is only whitespace
        const linesBetween = _.join(_.slice(lines, fromLine, toLine - 1), ' ');
        return _.isEmpty(_.trim(linesBetween));
    }

    /**
     * Remove all messages that should be ignored once (only for the first time they occurr)
     * @param {Object} warningList List of messages from which to remove warnings
     * @param {Object} toRemove List of ruleId's to remove from warningList
     * @return {Object} Filtered list of messages
     */
    _removeIgnoreOnceWarnings(warningList, toRemove, lines) {
        const self = this;
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

            if ((_.eq(warningRule, directiveRule)) && self._nothingBetweenLines(directiveLine, warningLine, lines)) {
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

            if (_.isNil(filteredWarnings)) { // nothing from the previos engines
                resolve({
                    warnings: [wooHoo]
                });
            }
            const lines = _.split(content, '\n');
            const directives = self._getLazyDirectives(lines);

            self._removeIgnoreOnceWarnings(filteredWarnings, directives.ignore_once, lines);
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
