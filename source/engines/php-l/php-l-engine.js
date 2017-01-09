
'use strict';

const _ = require('lodash');
const H = require('higher');
const EngineHelpers = require('@lazyass/engine-helpers');

const HelperContainer = EngineHelpers.HelperContainer;
const EngineHttpServer = EngineHelpers.EngineHttpServer;

const REPOSITORY_AUTH = JSON.parse(
    H.unless(H.isNonEmptyString, '{}', process.env.LAZY_REPOSITORY_AUTH_JSON));

const LAZY_VOLUME_NAME = process.env.LAZY_VOLUME_NAME;

const HELPER_CONTAINER_IMAGE_NAME = 'php:7.0.13-cli';

//  We are implicitly using `this` in overridden methods but lazy keep telling us not to.
/* eslint class-methods-use-this: off */
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
        const output = _.map(buffers,
            buffer => buffer && buffer.payload && buffer.payload.toString()
        ).join('');
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
    beforeListening() {
        return HelperContainer
            .createContainer(REPOSITORY_AUTH, HELPER_CONTAINER_IMAGE_NAME, LAZY_VOLUME_NAME)
            .then((containerId) => {
                //  Assume that the container has started correctly.
                this._containerId = containerId;
                this._helperContainer = new PhpLHelperContainer(containerId);
            });
    }

    getMeta() {
        return {
            languages: ['PHP']
        };
    }

    analyzeFile(...args) {
        //  Pass forward the arguments to the engine.
        return this._helperContainer.analyzeFile(...args);
    }

    afterListening() {
        this._helperContainer = null;

        //  Prevent trying to stop the same container twice.
        if (this._containerId) {
            const containerId = this._containerId;
            this._containerId = null;
            return HelperContainer.deleteContainer(containerId);
        }

        return Promise.resolve();
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
        return this._server.stop()
            .then(() => {
                this._server = null;
            });
    }
}

module.exports = Engine;
