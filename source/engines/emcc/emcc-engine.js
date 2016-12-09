
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

    _processContainerOutput(buffers) {
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
        return HelperContainer
            .createContainer(REPOSITORY_AUTH, HELPER_CONTAINER_IMAGE_NAME, LAZY_VOLUME_NAME)
            .then((container) => {
                //  Assume that the container has started correctly.
                this._container = container;
                return new EmccHelperContainer(container);
            });
    }

    _stopEngine() {
        return HelperContainer.deleteContainer(this._container);
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
