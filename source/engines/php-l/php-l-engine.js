
'use strict';

const _ = require('lodash');
const EngineHelpers = require('@lazyass/engine-helpers');

const HelperContainer = EngineHelpers.HelperContainer;
const EngineHttpServer = EngineHelpers.EngineHttpServer;

//  We are implicitly using `this` in overridden methods but lazy keep telling us not to.
// lazy ignore class-methods-use-this
class PhpLHelperContainer extends HelperContainer {
    constructor() {
        // Per image-metadata our helper container ID is php-l.
        super('php-l');
    }

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

class PhpLEngineHttpServer extends EngineHttpServer {
    beforeListening() {
        this._helperContainer = new PhpLHelperContainer();
        return Promise.resolve();
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
        return Promise.resolve();
    }
}

class Engine {
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
