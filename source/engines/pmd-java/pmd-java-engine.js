
'use strict';

/* global logger */

const _ = require('lodash');
const H = require('higher');
const EngineHelpers = require('@getlazy/engine-helpers');

const HelperContainer = EngineHelpers.HelperContainer;
const EngineHttpServer = EngineHelpers.EngineHttpServer;

//  We are implicitly using `this` in overridden methods but eslint keep telling us not to.
// lazy ignore class-methods-use-this
class PmdJavaHelperContainer extends HelperContainer {
    constructor() {
        // Per image-metadata our helper container ID is pmd-java.
        super('pmd-java');
    }

    _getBaseContainerExecParams() {
        return {
            User: 'root',
            Cmd: ['/usr/local/pmd-bin/bin/run.sh', 'pmd', '-R', 'java-basic,java-typeresolution',
                '-f', 'codeclimate', '-d']
        };
    }

    _processContainerOutput(buffers) {
        //  In this engine each line is a separate JSON so we first put together all the buffers
        //  and then we split them per lines.
        const jsonLines = _
            .chain(buffers)
            .map(buffer => buffer && buffer.payload && buffer.payload.toString())
            .join('')
            .split('\n')
            .value();

        //  Once the output has been split into lines, parse each line and create a warning for it.
        return {
            warnings: _
                .chain(jsonLines)
                .reject(_.isEmpty)
                .map((jsonLine) => {
                    try {
                        //  Clean \u0000 at the end of the jsonLine.
                        let cleanJsonLine;
                        if (_.last(jsonLine) === '\u0000') {
                            cleanJsonLine = jsonLine.slice(0, jsonLine.length - 1);
                        } else {
                            cleanJsonLine = jsonLine;
                        }

                        const warning = JSON.parse(cleanJsonLine);
                        return {
                            type: 'Warning',
                            line: H.ifFalsy(_.get(warning, 'location.lines.begin'), 0),
                            column: 1,
                            message: warning.description
                        };
                    } catch (e) {
                        logger.error('Failed to parse JSON', jsonLine, e);
                        return null;
                    }
                })
                .filter()
                .value()
        };
    }
}

class PmdJavaEngineHttpServer extends EngineHttpServer {
    beforeListening() {
        this._helperContainer = new PmdJavaHelperContainer();
        return Promise.resolve();
    }

    getMeta() {
        return {
            languages: ['Java']
        };
    }

    analyzeFile(...args) {
        //  Pass forward the arguments to the engine.
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
        this._server = new PmdJavaEngineHttpServer(port);
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
