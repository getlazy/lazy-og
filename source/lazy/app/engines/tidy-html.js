
'use strict';

const _ = require('lodash');
const DockerizedEngine = require('../lib/dockerized-engine');

const LANGUAGES = ['HTML'];
const NAME = 'tidy-html';

class TidyHtmlEngine extends DockerizedEngine
{
    _getContainerCmd() {
        return ['tidy', '-eq'];
    }

    _processEngineOutput(buffers) {
        //  Convert all the resulting buffers into string and join them as
        //  our parser works on a single string will all the output lines.
        const output = _.map(buffers, (buffer) => {
            return buffer && buffer.payload && buffer.payload.toString();
        }).join('');

        const OUTPUT_LINE_REGEX =
            /line (\d+) column (\d+) - (Info|Warning|Error): (.+)/g;
        const OUTPUT_LINE_REGEX_LINE_INDEX = 1;
        const OUTPUT_LINE_REGEX_COLUMN_INDEX = 2;
        const OUTPUT_LINE_REGEX_TYPE_INDEX = 3;
        const OUTPUT_LINE_REGEX_MESSAGE_INDEX = 4;

        const warnings = [];
        let match;
        while ((match = OUTPUT_LINE_REGEX.exec(output)) !== null) {
            warnings.push({
                type: match[OUTPUT_LINE_REGEX_TYPE_INDEX],
                line: _.toNumber(match[OUTPUT_LINE_REGEX_LINE_INDEX]),
                column: _.toNumber(match[OUTPUT_LINE_REGEX_COLUMN_INDEX]),
                message: match[OUTPUT_LINE_REGEX_MESSAGE_INDEX]
            });
        }

        return warnings;
    }
}

module.exports = new TidyHtmlEngine(NAME, LANGUAGES);
