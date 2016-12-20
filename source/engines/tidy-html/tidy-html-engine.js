
'use strict';

//  TODO:
//      * Add search for already existing helper engines
//      * Add re-creation of helper engines when "protocol" version changes (like we do in
//        StackManager)
//      * Add cleanup of helper engines once this process is stopped for a while (this obviously
//        outside of this process)

const _ = require('lodash');
const H = require('higher');

const EngineHelpers = require('@lazyass/engine-helpers');
const HelperContainer = EngineHelpers.HelperContainer;
const EngineHttpServer = EngineHelpers.EngineHttpServer;

const REPOSITORY_AUTH = JSON.parse(
    H.unless(H.isNonEmptyString, '{}', process.env.LAZY_REPOSITORY_AUTH_JSON));

const LAZY_VOLUME_NAME = process.env.LAZY_VOLUME_NAME;

const HELPER_CONTAINER_IMAGE_NAME = 'ierceg/tidy-html:5.2.0';

class TidyHtmlHelperContainer extends HelperContainer
{
    _getContainerCmd() {
        return ['tidy', '-eq'];
    }

    _processContainerOutput(buffers) {
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
        return HelperContainer
            .createContainer(REPOSITORY_AUTH, HELPER_CONTAINER_IMAGE_NAME, LAZY_VOLUME_NAME)
            .then((container) => {
                //  Assume that the container has started correctly.
                this._container = container;
                return new TidyHtmlHelperContainer(container);
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
