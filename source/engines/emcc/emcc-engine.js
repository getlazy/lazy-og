
'use strict';

/* global logger */

// lazy ignore class-methods-use-this

const _ = require('lodash');
const EngineHelpers = require('@getlazy/engine-helpers');

const HelperContainer = EngineHelpers.HelperContainer;
const AdaptedAtomLinter = EngineHelpers.AdaptedAtomLinter;
const EngineHttpServer = EngineHelpers.EngineHttpServer;

//  As seen in https://github.com/keplersj/linter-emscripten/blob/master/lib/main.js (MIT license)

class EmccHelperContainer extends HelperContainer {
    constructor() {
        // Per image-metadata our helper container ID is emcc.
        super('emcc');
    }

    _getContainerCmd() {
        return ['emcc', '-fsyntax-only', '-fno-caret-diagnostics', '-fno-diagnostics-fixit-info',
            '-fdiagnostics-print-source-range-info', '-fexceptions'];
    }

    _processContainerOutput(buffers) {
        //  Convert all the resulting buffers into string and join them as
        //  our parser works on a single string will all the output lines.
        const output = _.map(buffers,
            buffer => buffer && buffer.payload && buffer.payload.toString()
        ).join('');

        const EMCC_OUTPUT_REGEX = '(?<file>.+):(?<line>\\d+):(?<col>\\d+):({(?<lineStart>\\d+)' +
            ':(?<colStart>\\d+)-(?<lineEnd>\\d+):(?<colEnd>\\d+)}.*:)? (?<type>[\\w \\-]+): ' +
            '(?<message>.*)';

        return {
            warnings: _
                .chain(AdaptedAtomLinter.parse(output, EMCC_OUTPUT_REGEX))
                .map((warning) => {
                    //  EMCC returns all lower case for types.
                    warning.type = _.capitalize(warning.type);
                    //  Fix "Fatal error" type to "Fatal".
                    warning.type = warning.type === 'Fatal error' ? 'Error' : warning.type;
                    return warning;
                })
                .filter(line => line.type === 'Warning' || line.type === 'Error')
                .value()
        };
    }
}

class EmccEngineHttpServer extends EngineHttpServer {
    beforeListening() {
        this._helperContainer = new EmccHelperContainer();
        return Promise.resolve();
    }

    getMeta() {
        return {
            languages: ['C', 'C++', 'Objective-C', 'Objective-C++']
        };
    }

    analyzeFile(...args) {
        //  Pass forward the arguments to the helper container.
        return this._helperContainer.analyzeFile(...args)
            .then((result) => {
                // Mark the code as checked.
                _.assignIn(result, {
                    status: {
                        codeChecked: true
                    }
                });
                return result;
            });
    }

    afterListening() {
        this._helperContainer = null;
        return Promise.resolve();
    }
}

class Engine {
    start() {
        const port = process.env.PORT || 80;
        this._server = new EmccEngineHttpServer(port);
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
