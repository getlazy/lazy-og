
'use strict';

global.logger = require('@lazyass/engine-helpers').Logger.getEngineLogger();

//  Simplest possible HTTP server that accepts requests for file analysis from lazy service.

const _ = require('lodash');
const express = require('express');
const bodyParser = require('body-parser');
const selectn = require('selectn');

const eslint = require('eslint');
//  Extend the google config with custom options.
const eslintConfigGoogle = _.extend(require('eslint-config-google'), {
    envs: ['node', 'es6'],
    parser: 'babel-eslint',
    parserOptions: {
        ecmaVersion: 7
    }
});
//  lazy config is a customization of Google config.
const eslintLazyConfig = _.cloneDeep(eslintConfigGoogle);
eslintLazyConfig.rules = _.extend(eslintLazyConfig.rules, {
    'no-console': 2,
    'no-dupe-args': 2,
    'no-dupe-keys': 2,
    'no-unreachable': 2,
    'max-len': [2, {
        code: 100,
        tabWidth: 4,
        ignoreUrls: true
    }],
    'comma-dangle': [2, 'never'],
    'default-case': 2,
    'no-fallthrough': 2,
    'no-implicit-globals': 2,
    //  'no-undef': 2,  //  Removed for now as `config.envs` doesn't seem to work so we get too
    //  spurious warnings on `require`, `Promise` as undeclared globals.
    'no-undefined': 2,
    'no-use-before-define': 2
});

const getConfig = (config) => {
    switch (_.toLower(config)) {
        case 'google':
            return eslintConfigGoogle;
        default:
            return eslintLazyConfig;
    }
};

//  Use the Google config to lint the incoming content.
const lint = (content, config) => {
    //  We use a promise as we get any exceptions wrapped up as failures.
    return new Promise((resolve) => {
        resolve(eslint.linter.verify(content, getConfig(config)));
    });
};

//  Setup Express application.
const app = express();
app.use(bodyParser.json());

//  Listen on POST /file for requests. These requests are not 100% the same as the one
//  we are receiving in lazy service as language most notably needs to be translated from
//  the client value into stylelint value.
app.post('/file', (req, res) => {
    const content = selectn('body.content', req);
    const config = selectn('body.config', req);
    lint(content, config)
        .then((results) => {
            const warnings = _
                .chain(results)
                .map((warning) => {
                    return {
                        type: warning.fatal ? 'Error' : 'Warning',
                        message: warning.message,
                        line: warning.line,
                        column: warning.column
                    };
                })
                .filter()
                .value();

            res.send({
                warnings: warnings
            });
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
    logger.info('`eslint-engine` listening on', port);
});
