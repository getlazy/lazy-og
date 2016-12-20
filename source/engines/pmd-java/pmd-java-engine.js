
'use strict';

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
            .map((buffer) => {
                return buffer && buffer.payload && buffer.payload.toString();
            })
            .value()
            .join('')
            .split('\n');

        //  Once the output has been split into lines, parse each line and create a warning for it.
        return {
            warnings: _
                .chain(jsonLines)
                .filter(_.negate(_.isEmpty))
                .map((jsonLine) => {
                    try {
                        //  Clean \u0000 at the end of the jsonLine.
                        if (_.last(jsonLine) === '\u0000') {
                            jsonLine = jsonLine.slice(0, jsonLine.length - 1);
                        }
                        const warning = JSON.parse(jsonLine);
                        return {
                            type: 'Warning',
                            line: H.ifFalsy(selectn('location.lines.begin', warning), 0),
                            column: 1,
                            message: warning.description
                        };
                    } catch (e) {
                        logger.error('Failed to parse JSON', jsonLine, e);
                        return;
                    }
                })
                .filter()
                .value()
        };
    }
}

class PmdJavaEngineHttpServer extends EngineHttpServer
{
    _bootEngine() {
        return HelperContainer
            .createContainer(REPOSITORY_AUTH, HELPER_CONTAINER_IMAGE_NAME, LAZY_VOLUME_NAME)
            .then((container) => {
                //  Assume that the container has started correctly.
                this._container = container;
                return new PmdJavaHelperContainer(container);
            });
    }

    _stopEngine() {
        //  Prevent trying to stop the same container twice.
        const container = this._container;
        this._container = null;
        return HelperContainer.deleteContainer(container);
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
