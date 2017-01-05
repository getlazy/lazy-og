
'use strict';

/* global logger */

const _ = require('lodash');
const H = require('higher');
const selectn = require('selectn');
const EngineHelpers = require('@lazyass/engine-helpers');

const HelperContainer = EngineHelpers.HelperContainer;
const EngineHttpServer = EngineHelpers.EngineHttpServer;

const REPOSITORY_AUTH = JSON.parse(
    H.unless(H.isNonEmptyString, '{}', process.env.LAZY_REPOSITORY_AUTH_JSON));

const LAZY_VOLUME_NAME = process.env.LAZY_VOLUME_NAME;

const HELPER_CONTAINER_IMAGE_NAME = 'codacy/codacy-pmdjava:1.0.114';

//  We are implicitly using `this` in overriden methods but eslint keep telling us not to.
/* eslint class-methods-use-this: off */
class PmdJavaHelperContainer extends HelperContainer
{
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
                            line: H.ifFalsy(selectn('location.lines.begin', warning), 0),
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

class PmdJavaEngineHttpServer extends EngineHttpServer
{
    beforeListening() {
        return HelperContainer
            .createContainer(REPOSITORY_AUTH, HELPER_CONTAINER_IMAGE_NAME, LAZY_VOLUME_NAME)
            .then((containerId) => {
                //  Assume that the container has started correctly.
                this._containerId = containerId;
                this._helperContainer = new PmdJavaHelperContainer(containerId);
            });
    }

    getMeta() {
        return {
            languages: ['Java']
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
