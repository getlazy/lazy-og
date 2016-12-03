
'use strict';

global.logger = require('@lazyass/engine-helpers').Logger.getEngineLogger();

//  TODO:
//      * Move HTTP server code into engine-helpers
//      * Move launching of DockerizedEngine into engine-helpers
//      * Add search for already existing helper engines
//      * Add re-creation of helper engines when "protocol" version changes (like we do in
//        StackManager)
//      * Add cleanup of helper engines once this process is stopped for a while (this obviously
//        outside of this process)

//  Simplest possible HTTP server that accepts requests for file analysis from lazy service.

const _ = require('lodash');
const express = require('express');
const bodyParser = require('body-parser');
const selectn = require('selectn');
const HigherDockerManager = require('@lazyass/higher-docker-manager');
const DockerizedEngine = require('@lazyass/engine-helpers').DockerizedEngine;
const H = require('higher');

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

//  Setup Express application.
const app = express();
app.use(bodyParser.json());

//  This will be set once the helper container is ready.
let engine;

//  Middleware that returns 503 if the engine isn't ready to accept requests yet.
app.use((req, res, next) => {
    if (!_.isUndefined(engine)) {
        return next();
    }

    //  Send service unavailable with an arbitrary length of Retry-After header.
    //  This allows our running stack to gracefully handle the case.
    const ARBITRARY_SERVICE_UNAVAILABLE_RETRY_AFTER = 5/* seconds */;
    res.setHeader('Retry-After', ARBITRARY_SERVICE_UNAVAILABLE_RETRY_AFTER);
    res.sendStatus(503);
});

//  Listen on POST /file for requests. These requests are not 100% the same as the one
//  we are receiving in lazy service as language most notably needs to be translated from
//  the client values into common values.
app.post('/file', (req, res) => {
    const content = selectn('body.content', req);
    const clientPath = selectn('body.clientPath', req);
    const language = selectn('body.language', req);
    const config = selectn('body.config', req);

    engine.analyzeFile(content, clientPath, language, config)
        .then((results) => {
            res.send(results);
        })
        .catch((err) => {
            logger.error('Linting failed', err);
            res.status(500).send({
                error: err.message
            });
        });
});

const port = process.env.PORT || 80;
app.listen(port, () => {
    HigherDockerManager.pullImage(HELPER_CONTAINER_IMAGE_NAME)
        .then(() => {
            return HigherDockerManager.getOwnContainer();
        })
        .then((engineContainer) => {
            //  Get the engine network name assuming that it's the first of all the networks that
            //  engine container has access to. This is a safe assumption as engines should be
            //  attached only to stack networks.
            const engineNetworkName = _.first(_.keys(selectn(
                'NetworkSettings.Networks', engineContainer)));

            //  Create the helper container.
            const createHelperParams = {
                //  Name it after the engine name and stack.
                Image: HELPER_CONTAINER_IMAGE_NAME,
                //  We keep the helper image running so that we can execute our jobs in it without
                //  starting/stopping or creating/starting/stopping temporary containers.
                Entrypoint: 'tail',
                Cmd: '-f /dev/null'.split(' '),
                VolumesFrom: [_.trimStart(_.first(engineContainer.Names), '/')],
                HostConfig: {
                    //  When networking mode is a name of another network it's
                    //  automatically attached.
                    NetworkMode: engineNetworkName,
                    Binds: [
                        //  HACK: We hard-code the stack volume mount path to /lazy which is known
                        //  to all containers.
                        process.env.LAZY_STACK_VOLUME_NAME + ':/lazy'
                    ],
                    RestartPolicy: {
                        Name: 'unless-stopped'
                    }
                },
                WorkingDir: '/lazy'
            };

            return HigherDockerManager.createContainer(createHelperParams);
        })
        .then((container) => {
            return container.start();
        })
        .then((container) => {
            engine = new TidyHtmlEngine(NAME, LANGUAGES, container);
            logger.info('`tidy-html-engine` listening on', port);
        })
        .catch((err) => {
            logger.error('Failed to correctly boot the engine', err);
            process.exit(-1);
        });
});
