
'use strict';

const EngineHelpers = require('@lazyass/engine-helpers');
global.logger = EngineHelpers.Logger.getEngineLogger();

const _ = require('lodash');
const DockerizedEngine = EngineHelpers.DockerizedEngine;
const EngineHttpServer = EngineHelpers.EngineHttpServer;
const EngineHelperContainerCreator = EngineHelpers.EngineHelperContainerCreator;

const NAME = 'php-l';
const LANGUAGES = ['PHP'];
const HELPER_CONTAINER_IMAGE_NAME = 'php:7.0.13-cli';

class PhpLEngine extends DockerizedEngine
{
    _getContainerCmd() {
        return ['php', '--syntax-check',
            '--define', 'display_errors=On',
            '--define', 'log_errors=Off',
            '--define', 'error_reporting=E_ALL'];
    }

    _processEngineOutput(buffers) {
        //  Convert all the resulting buffers into string and join them as
        //  our parser works on a single string will all the output lines.
        const output = _.map(buffers, (buffer) => {
            return buffer && buffer.payload && buffer.payload.toString();
        }).join('');
        const messages = [];

        //  As seen in https://github.com/AtomLinter/linter-php/blob/master/lib/main.js (MIT license)
        //  We rely on the change of state of the regex object during the reasing so we cannot
        //  initialize it on the module leve.
        const parseRegex = /^(?:Parse|Fatal) error:\s+(.+) in .+?(?: on line |:)(\d+)/gm;

        //  For all matches add a new warning.
        let match = parseRegex.exec(output);
        while (match !== null) {
            const line = Number.parseInt(match[2], 10) - 1;
            messages.push({
                type: 'Error',
                line: line + 1,
                column: 1,
                message: match[1]
            });
            match = parseRegex.exec(output);
        }

        return {
            warnings: messages
        };
    }
}

class PhpLEngineHttpServer extends EngineHttpServer
{
    _bootEngine() {
        return EngineHelperContainerCreator.create(HELPER_CONTAINER_IMAGE_NAME)
            .then((container) => {
                //  Assume that the container has started correctly.
                return new PhpLEngine(NAME, LANGUAGES, container);
            });
    }
}

const server = new PhpLEngineHttpServer(NAME, process.env.PORT || 80);
server.start();
