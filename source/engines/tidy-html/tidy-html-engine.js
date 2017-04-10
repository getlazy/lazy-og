
'use strict';

/* global logger */

const _ = require('lodash');
const H = require('higher');

const EngineHelpers = require('@lazyass/engine-helpers');

const HelperContainer = EngineHelpers.HelperContainer;
const EngineHttpServer = EngineHelpers.EngineHttpServer;

//  We are implicitly using `this` in overridden methods but eslint keep telling us not to.
// lazy ignore class-methods-use-this
class TidyHtmlHelperContainer extends HelperContainer {
    constructor() {
        // Per image-metadata our helper container ID is tidy-html.
        super('tidy-html');
    }

    _getContainerCmd() {
        return ['tidy', '-eq'];
    }

    _processContainerOutput(buffers) {
        //  Convert all the resulting buffers into string and join them as
        //  our parser works on a single string will all the output lines.
        const output = _.map(buffers,
            buffer => buffer && buffer.payload && buffer.payload.toString()
        ).join('');

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
                line: H.unless(_.isNan, _.toNumber(match[OUTPUT_LINE_REGEX_LINE_INDEX]), 1),
                column: H.unless(_.isNan, _.toNumber(match[OUTPUT_LINE_REGEX_COLUMN_INDEX]), 1),
                message: match[OUTPUT_LINE_REGEX_MESSAGE_INDEX]
            });
        }

        return {
            warnings
        };
    }
}

class TidyHtmlEngineHttpServer extends EngineHttpServer {
    beforeListening() {
        this._helperContainer = new TidyHtmlHelperContainer();
        return Promise.resolve();
    }

    getMeta() {
        return {
            languages: ['HTML']
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
        this._server = new TidyHtmlEngineHttpServer(port);
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
