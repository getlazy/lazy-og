
'use strict';

const _ = require('lodash');
const H = require('higher');

const EngineHelpers = require('@lazyass/engine-helpers');

const HelperContainer = EngineHelpers.HelperContainer;
const AdaptedAtomLinter = EngineHelpers.AdaptedAtomLinter;
const EngineHttpServer = EngineHelpers.EngineHttpServer;

const REPOSITORY_AUTH = JSON.parse(
    H.unless(H.isNonEmptyString, '{}', process.env.LAZY_REPOSITORY_AUTH_JSON));

const LAZY_VOLUME_NAME = process.env.LAZY_VOLUME_NAME;

const HELPER_CONTAINER_IMAGE_NAME = 'apiaryio/emcc:1.36';

//  As seen in https://github.com/keplersj/linter-emscripten/blob/master/lib/main.js (MIT license)

class EmccHelperContainer extends HelperContainer
{
    _getContainerCmd() {
        return ['emcc', '-fsyntax-only', '-fno-caret-diagnostics', '-fno-diagnostics-fixit-info',
            '-fdiagnostics-print-source-range-info', '-fexceptions'];
    }

    /* eslint class-methods-use-this: off */
    _processContainerOutput(buffers) {
        //  Convert all the resulting buffers into string and join them as
        //  our parser works on a single string will all the output lines.
        const output = _.map(buffers,
            buffer => buffer && buffer.payload && buffer.payload.toString()
        ).join('');

        /* eslint no-useless-escape: off */
        const EMCC_OUTPUT_REGEX = '(?<file>.+):(?<line>\\d+):(?<col>\\d+):(\{(?<lineStart>\\d+)' +
            ':(?<colStart>\\d+)\-(?<lineEnd>\\d+):(?<colEnd>\\d+)}.*:)? (?<type>[\\w \\-]+): ' +
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

class EmccEngineHttpServer extends EngineHttpServer
{
    beforeListening() {
        return HelperContainer
            .createContainer(REPOSITORY_AUTH, HELPER_CONTAINER_IMAGE_NAME, LAZY_VOLUME_NAME)
            .then((container) => {
                //  Assume that the container has started correctly.
                this._container = container;
                this._engine = new EmccHelperContainer(container);
            });
    }

    getMeta() {
        return {
            languages: ['C', 'C++', 'Objective-C', 'Objective-C++']
        };
    }

    analyzeFile() {
        //  Pass forward the arguments to the engine.
        return this._engine.analyzeFile.apply(this._engine, arguments);
    }

    afterListening() {
        if (this._container) {
            //  Prevent trying to stop the same container twice.
            const container = this._container;
            this._container = null;
            return HelperContainer.deleteContainer(container);
        }

        return Promise.resolve();
    }
}

class Engine
{
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
