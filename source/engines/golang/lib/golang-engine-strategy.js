
'use strict';

/* global logger */

const _ = require('lodash');
const EngineHelpers = require('@getlazy/engine-helpers');

const HelperContainer = EngineHelpers.HelperContainer;

//  We are implicitly using `this` in overridden methods but lazy keep telling us not to.
// lazy ignore class-methods-use-this
class GolangHelperContainer extends HelperContainer {
    constructor() {
        // Per image-metadata our helper container ID is gometalinter.
        super('gometalinter');
    }

    _getContainerCmd() {
        return ['gometalinter', '--json'];
    }

    _processContainerOutput(buffers) {
        //  Convert all the resulting buffers into string and join them as
        //  our parser works on a single string will all the output lines.
        const output = _.map(buffers,
            buffer => buffer && buffer.payload && buffer.payload.toString()
        ).join('');
        const messages = _.map(JSON.parse(output), (message) => {
            return {
                type: 'Error',
                line: message.line,
                column: 1,
                message: message.message
            };
        });

        return {
            warnings: messages
        };
    }
}

module.exports = {
    configure(/* config */) {
        this._helperContainer = new GolangHelperContainer();
        return Promise.resolve();
    },

    shutDown() {
        this._helperContainer = null;
        return Promise.resolve();
    },

    handleRequest(hostPath, language, content, context) {
        return this._helperContainer.analyzeFile(hostPath, language, content, context)
            .then((warnings) => {
                const metrics = [];
                return {
                    status: {
                        codeChecked: true
                    },
                    warnings,
                    metrics
                };
            });
    },

    getMeta() {
        return {
            languages: ['Go']
        };
    }
};
