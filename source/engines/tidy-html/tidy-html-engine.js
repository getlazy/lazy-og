
'use strict';

const EngineHelpers = require('@lazyass/engine-helpers');
global.logger = EngineHelpers.Logger.getEngineLogger();

//  TODO:
//      * Move launching of DockerizedEngine into engine-helpers
//      * Add search for already existing helper engines
//      * Add re-creation of helper engines when "protocol" version changes (like we do in
//        StackManager)
//      * Add cleanup of helper engines once this process is stopped for a while (this obviously
//        outside of this process)

//  Simplest possible HTTP server that accepts requests for file analysis from lazy service.

const _ = require('lodash');
const H = require('higher');

const DockerizedEngine = EngineHelpers.DockerizedEngine;
const EngineHttpServer = EngineHelpers.EngineHttpServer;
const EngineHelperContainerCreator = EngineHelpers.EngineHelperContainerCreator;

const LANGUAGES = ['HTML'];
const NAME = 'tidy-html';
const HELPER_CONTAINER_IMAGE_NAME = 'ierceg/tidy-html:5.2.0';

class TidyHtmlEngine extends DockerizedEngine
{
    _getContainerCmd() {
        return ['tidy', '-eq'];
    }

    _processEngineOutput(buffers) {
        //  Convert all the resulting buffers into string and join them as
        //  our parser works on a single string will all the output lines.
        const output = _.map(buffers, (buffer) => {
            return buffer && buffer.payload && buffer.payload.toString();
        }).join('');

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
            warnings: warnings
        };
    }
}

class TidyHtmlEngineHttpServer extends EngineHttpServer
{
    _bootEngine() {
        return EngineHelperContainerCreator.create(HELPER_CONTAINER_IMAGE_NAME)
            .then((container) => {
                //  Assume that the container has started correctly.
                return new TidyHtmlEngine(NAME, LANGUAGES, container);
            });
    }
}

const server = new TidyHtmlEngineHttpServer(NAME, process.env.PORT || 80);
server.start();
