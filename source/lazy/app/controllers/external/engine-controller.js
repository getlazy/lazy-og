'use strict';

/* global logger */

const _ = require('lodash');
const selectn = require('selectn');
const proxy = require('http-proxy-middleware');
const PACKAGE_VERSION = require('../../../package.json').version;
const EnginePipeline = require('../../engine-pipeline');

let enginePipeline;
let engineManager;

const addEndpoints = (app, options) => {
    app.get('/version', (req, res) => {
        res.send({
            service: PACKAGE_VERSION,
            api: 'v20161217'
        });
    });

    app.get('/engines', (req, res) => {
        res.send(_.reduce(engineManager.engines, (engines, engine) => {
            // lazy ignore-once no-param-reassign
            engines[engine.name] = {
                url: engine.url,
                meta: engine.meta
            };
            return engines;
        }, {}));
    });

    app.post('/file', (req, res) => {
        const language = selectn('body.language', req);
        if (_.isEmpty(language)) {
            return res.status(400).send();
        }

        const hostPath = selectn('body.hostPath', req);
        const content = selectn('body.content', req);
        const context = selectn('body.context', req);

        try {
            const statuses = [];
            return enginePipeline.run(hostPath, language, content, context, statuses)
                .then((warnings) => {
                    // Did any engine reported that is has checked the code?
                    if (!_.find(statuses, { codeChecked: true })) {
                        warnings.warnings.push({
                            type: 'Info',
                            //  We set spaces around the rule ID so that it cannot be disabled.
                            ruleId: ' lazy-no-linters-defined ',
                            message: `No engine registered for [${language}]. This file has not been checked for language-specific warnings.`,
                            filePath: hostPath
                        });
                        // Remove the info that all is fine, since we don't really know it
                        // if no engine checked the file. Delete rules ' lazy-no-linter-warnings '
                        _.remove(warnings.warnings, warn =>
                            (_.eq(warn.ruleId, ' lazy-no-linter-warnings ')));
                    }
                    return res.send(warnings);
                }).catch((err) => {
                    res.status(500).send({
                        error: err && err.message
                    });
                });
        } catch (e) {
            logger.error('Exception during file analysis', e);
            return res.status(500).send({
                error: e && e.message
            });
        }
    });

    //  Create proxies to pass all requests that get to /engine/{engine.name}/* paths.
    _.forEach(engineManager.engine, (engine) => {
        const enginePath = `/engine/${engine.name}`;

        //  Proxy all calls from /engine/<engine.name> to the engine.
        //  Allow websockets upgrade.
        const proxyOptions = {
            target: engine.url,
            ws: true,
            pathRewrite: {}
        };
        proxyOptions.pathRewrite[`^${enginePath}`] = '';

        app.use(enginePath, proxy(enginePath, proxyOptions));
    });

    //  Proxy the rest of calls to / to UI engine if one has been configured.
    const uiEngine = _.get(options, 'engineManager.uiEngine');
    if (uiEngine) {
        //  Proxy all calls from / to the engine and allow websockets upgrade.
        app.use('/', proxy({
            target: uiEngine.url,
            ws: true
        }));
    }
};

const initialize = (app, options) => {
    engineManager = options.engineManager;
    enginePipeline = new EnginePipeline(engineManager, _.get(options, 'config.engine_pipeline'));
    addEndpoints(app, options);
    return Promise.resolve();
};

module.exports = {
    initialize
};
