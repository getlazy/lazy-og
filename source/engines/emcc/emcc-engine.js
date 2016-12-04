
'use strict';

const EngineHelpers = require('@lazyass/engine-helpers');
global.logger = EngineHelpers.Logger.getEngineLogger();

const _ = require('lodash');

const DockerizedEngine = EngineHelpers.DockerizedEngine;
const AdaptedAtomLinter = EngineHelpers.AdaptedAtomLinter;
const EngineHttpServer = EngineHelpers.EngineHttpServer;
const EngineHelperContainerCreator = EngineHelpers.EngineHelperContainerCreator;

const NAME = 'emcc';
const LANGUAGES = ['C++', 'C', 'Objective-C', 'Objective-C++'];
const HELPER_CONTAINER_IMAGE_NAME = 'apiaryio/emcc:1.36';

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
                .map((warning) => {
                    //  EMCC returns all lower case for types.
                    warning.type = _.capitalize(warning.type);
                    return warning;
                })
                .each((line) => {
                    //  Fix "Fatal error" type to "Fatal".
                    line.type = line.type === 'Fatal error' ? 'Error' : line.type;
                })
                .filter((line) => line.type === 'Warning' || line.type === 'Error')
                .value()
        };
    }
}

class EmccEngineHttpServer extends EngineHttpServer
{
    _bootEngine() {
        return EngineHelperContainerCreator.create(HELPER_CONTAINER_IMAGE_NAME)
            .then((container) => {
                //  Assume that the container has started correctly.
                return new EmccEngine(NAME, LANGUAGES, container);
            });
    }
}

const server = new EmccEngineHttpServer(NAME, process.env.PORT || 80);
server.start();
