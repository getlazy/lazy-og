
'use strict';

/* global logger */

// lazy ignore class-methods-use-this

const _ = require('lodash');
const EngineHelpers = require('@lazyass/engine-helpers');

const EngineHttpServer = EngineHelpers.EngineHttpServer;
const infoWooHoo = {
    type: 'Info',
    message: '',
    ruleId: ' lazy-no-linter-warnings '
};
const infoIgnoredAll = {
    type: 'Info',
    message: 'All lazy checks ignored in this file.',
    ruleId: ' lazy-off '
};
const infoCodeNotChecked = {
    type: 'Info',
    ruleId: ' lazy-no-linters-defined ',
    message: ''
};

const supportedLanguages = ['javascript', 'json', 'yaml', 'html', 'c', 'c++', 'objective-c', 'objective-c++', 'css', 'scss', 'less', 'sugarcss', 'php', 'java', 'cpp', 'c#', 'shell', 'ruby', 'python', 'coffeescript'];

const VERY_LARGE_LINE_NUMBER = 100000000;  // Probably no file will have more than 100 milion lines...

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
        const regex = /(#|\/*|\/\/)\W*lazy\s+(\S*)\s*([^;*]*)\s*;*(.*)/g;

        const command = {
            commandStr: '',
            args: [],
            comment: ''
        };

        let m;
        while ((m = regex.exec(line)) !== null) {
            // This is necessary to avoid infinite loops with zero-width matches
            if (m.index === regex.lastIndex) {
                regex.lastIndex++;
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
            ignore_all: false,
            ignore: [],
            ignore_once: [],
            ignore_local: [],
            dead_zones: []   // Dead zones are parts of the file in which we should ignore warnings
        };

        let deadZone;

        _.forEach(lines, (oneLine, lineNo) => {
            const command = self._parseLine(oneLine);

            // Ignoring all the rules?
            if (_.eq(command.commandStr, 'ignore-all')) {
                directives.ignore_all = true;
                return;
            }

            if (_.eq(command.commandStr, 'ignore-start')) {
                deadZone = {
                    startLine: lineNo + 1,
                    endLine: VERY_LARGE_LINE_NUMBER
                };
            }

            if (_.eq(command.commandStr, 'ignore-end')) {
                if (!_.isNil(deadZone)) {
                    // If deadZone is not nill, that means we have
                    // detected ignore-start directive before
                    deadZone.endLine = lineNo + 1;
                    directives.dead_zones.push(deadZone);
                    deadZone = undefined;
                }
            }

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

        // Finally, if there was ignore-start,
        // but no ignore-end, add dead zone
        if (!_.isNil(deadZone)) {
            directives.dead_zones.push(deadZone);
        }

        return directives;
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
     * Remove all messages that should be globally ignored
     * @param {Object} warningList List of messages from which to remove warnings
     * @param {Object} toRemove List of ruleId's to remove from warningList
     * @return {Object} Filtered list of messages
     */
    _removeIgnoreWarnings(warningList, toRemove) {
        _.remove(warningList, (warning) => {
            const ruleId = _.get(warning, 'ruleId');
            if (_.isNil(ruleId) || !_.includes(toRemove, _.toLower(ruleId))) {
                return false;
            }
            logger.metric('remove-warning', { ruleId });
            return true;
        });
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
                logger.metric('remove-local-warnings', {
                    ruleId: warning.ruleId
                });
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
    }

    _removeIgnoreAlwaysWarnings(warningList, ignoreAlwaysWarnings) {
        if (_.isEmpty(ignoreAlwaysWarnings)) {
            return;
        }

        // Always omit all warnings which rule ID is on the list of ignore-always.
        _.remove(warningList, (warning) => {
            const remove = !_.isUndefined(warning.ruleId) && _.includes(ignoreAlwaysWarnings, warning.ruleId);
            if (remove) {
                logger.metric('remove-ignore-always-warnings', {
                    ruleId: warning.ruleId
                });
            }
            return remove;
        });
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
                logger.metric('remove-ignore-once-warnings', {
                    ruleId: warningRule
                });
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
                //  We set spaces around the rule ID so that it cannot be disabled.
                ruleId: ' lazy-no-ignore-once ',
                line: warn.line,
                column: 1
            });
        });
    }

    /**
     * Removes all messages from dead zones. Dead zones are lines between
     * lazy ignore-start and lazy ignore-end directives.
     * @param {Object} warningList List of messages from which to remove warnings
     * @param {Object} deadZones List of dead zones to remove warnings from
     * @return {Object} Filtered list of messages
     */
    _removeDeadZoneWarnings(warningList, deadZones) {
        _.pullAllWith(warningList, deadZones, (warning, oneDeadZone) => {
            const warningLine = _.parseInt(_.get(warning, 'line', 0), 10);
            if (!_.inRange(warningLine, oneDeadZone.startLine, oneDeadZone.endLine)) {
                return false;
            }
            logger.metric('remove-dead-zone-warning', { ruleId: warning.ruleId });
            return true;
        });
        return warningList;
    }

    /**
     * Analyzes the previous engine's messages that are passed in context,
     * and post process them according to directives found in content.
     * @param {string} hostPath Path of the source file requesting lazy to analyze.
     * @param {string} language Language of the source file.
     * @param {string} content Content of the source file requesting lazy to analyze.
     * @return {Promise} Promise resolving with results of the file analysis.
     */
    analyzeFile(hostPath, language, content, context) {
        const self = this;

        //  We use a promise as we get any exceptions wrapped up as failures.
        return new Promise((resolve) => {
            const filteredWarnings = _.get(context, 'previousStepResults.warnings', []);
            const wooHooMsgs = _.get(context, 'engineParams.woohoos',
                ['Woo-hoo! No linter warnings - your code looks pretty nice.']);
            const ignoreAlwaysWarnings = _.get(context, 'engineParams.ignore-always');

            infoWooHoo.message = _.sample(wooHooMsgs);
            infoCodeNotChecked.message = `No engine registered for [${language}]. This file has not been checked for language-specific warnings.`;

            // Did any engine reported that it has checked the code?
            const previousStatus = _.get(context, 'previousStepResults.status', {});
            const isCodeChecked = _.get(previousStatus, 'codeChecked', false);
            if (!isCodeChecked) {
                filteredWarnings.push(infoCodeNotChecked);
            }

            // If there are no warnings from previous steps and the code is checked,
            // then don't bother, just return wooHoo
            if (_.isEmpty(filteredWarnings)) { // nothing from the previos engines
                logger.metric('woohoo-state');
                resolve({ warnings: [infoWooHoo] });
                return;
            }

            // Log metrics for all warnings.
            _.forEach(filteredWarnings, warning => logger.metric('warning', { ruleId: warning.ruleId }));

            // Remove all always ignore warnings.
            self._removeIgnoreAlwaysWarnings(filteredWarnings, ignoreAlwaysWarnings);

            // Look for directive only in languages that support either //, / *, or # style comments
            if (_.includes(supportedLanguages, _.toLower(_.trim(language)))) {
                const lines = _.split(content, '\n');
                const directives = self._getLazyDirectives(lines);

                if (directives.ignore_all) {
                    // Ignoring everything - report it and get out
                    logger.metric('ignored-all');
                    const newFilteredWarnings = [infoIgnoredAll];
                    if (!isCodeChecked) {
                        newFilteredWarnings.push(infoCodeNotChecked);
                    }
                    resolve({ warnings: newFilteredWarnings });
                    return;
                }
                self._removeIgnoreOnceWarnings(filteredWarnings, directives.ignore_once, lines);
                self._removeLocalWarnings(filteredWarnings, directives.ignore_local);
                self._removeIgnoreWarnings(filteredWarnings, directives.ignore);
                self._removeDeadZoneWarnings(filteredWarnings, directives.dead_zones);
            }

            // If there are no warnings after processing directives, return wooHoo
            if (_.isEmpty(filteredWarnings)) {
                logger.metric('woohoo-state');
                filteredWarnings.push(infoWooHoo);
            }
            resolve({ warnings: filteredWarnings });
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
