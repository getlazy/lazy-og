
'use strict';

const _ = require('lodash');
const H = require('higher');
const selectn = require('selectn');
const DockerizedEngine = require('../dockerized-engine');

const NAME = 'pmd-java';
const LANGUAGES = ['Java'];

class PmdJavaEngine extends DockerizedEngine
{
    _getContainerCmd() {
        return ['/usr/local/pmd-bin/bin/run.sh', 'pmd', '-R', 'java-basic,java-typeresolution',
            '-f', 'codeclimate', '-d'];
    }

    _processEngineOutput(buffers) {
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
                        return undefined;
                    }
                })
                .filter()
                .value()
        };
    }
}

module.exports = new PmdJavaEngine(NAME, LANGUAGES);
