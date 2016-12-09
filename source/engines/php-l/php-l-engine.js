
'use strict';

const EngineHelpers = require('@lazyass/engine-helpers');
global.logger = EngineHelpers.Logger.getEngineLogger();

const _ = require('lodash');
const H = require('higher');

const HelperContainer = EngineHelpers.HelperContainer;
const EngineHttpServer = EngineHelpers.EngineHttpServer;

const REPOSITORY_AUTH = JSON.parse(
    H.unless(H.isNonEmptyString, '{}', process.env.LAZY_REPOSITORY_AUTH_JSON));

const LAZY_VOLUME_NAME = process.env.LAZY_VOLUME_NAME;

const HELPER_CONTAINER_IMAGE_NAME = 'php:7.0.13-cli';

class PhpLHelperContainer extends HelperContainer
{
    _getContainerCmd() {
        return ['php', '--syntax-check',
            '--define', 'display_errors=On',
            '--define', 'log_errors=Off',
            '--define', 'error_reporting=E_ALL'];
    }

    _processContainerOutput(buffers) {
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
        return HelperContainer
            .createContainer(REPOSITORY_AUTH, HELPER_CONTAINER_IMAGE_NAME, LAZY_VOLUME_NAME)
            .then((container) => {
                //  Assume that the container has started correctly.
                this._container = container;
                return new PhpLHelperContainer(container);
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
        this._server = new PhpLEngineHttpServer(port);
        return this._server.start();
    }

    stop() {
        this._server.stop();
        this._server = null;
    }
}

module.exports = Engine;
