
'use strict';

const _ = require('lodash');
const DockerizedEngine = require('../dockerized-engine');
const AdaptedAtomLinter = require('@lazyass/engine-helpers').AdaptedAtomLinter;

const NAME = 'emcc';
const LANGUAGES = ['C++', 'C', 'Objective-C', 'Objective-C++'];

//  As seen in https://github.com/keplersj/linter-emscripten/blob/master/lib/main.js (MIT license)

class EmccEngine extends DockerizedEngine
{
    _getContainerCmd() {
        return ['emcc', '-fsyntax-only', '-fno-caret-diagnostics', '-fno-diagnostics-fixit-info',
            '-fdiagnostics-print-source-range-info', '-fexceptions'];
    }

    _processEngineOutput(buffers) {
        //  Convert all the resulting buffers into string and join them as
        //  our parser works on a single string will all the output lines.
        const output = _.map(buffers, (buffer) => {
            return buffer && buffer.payload && buffer.payload.toString();
        }).join('');

        const EMCC_OUTPUT_REGEX = '(?<file>.+):(?<line>\\d+):(?<col>\\d+):(\{(?<lineStart>\\d+)' +
            ':(?<colStart>\\d+)\-(?<lineEnd>\\d+):(?<colEnd>\\d+)}.*:)? (?<type>[\\w \\-]+): ' +
            '(?<message>.*)';

        return {
            warnings: _
                .chain(AdaptedAtomLinter.parse(output, EMCC_OUTPUT_REGEX))
                .each((line) => {
                    //  Fix "fatal error" type to error.
                    line.type = line.type === 'fatal error' ? 'error' : line.type;
                })
                .filter((line) => line.type === 'warning' || line.type === 'error')
                .value()
        };
    }
}

module.exports = new EmccEngine(NAME, LANGUAGES);
