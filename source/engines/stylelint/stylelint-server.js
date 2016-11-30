
'use strict';

//  Simplest possible HTTP server that accepts requests for file analysis from lazy service.

const _ = require('lodash');
const express = require('express');
const bodyParser = require('body-parser');
const selectn = require('selectn');

const stylelint = require('stylelint');
const stylelintConfigStandard = require('stylelint-config-standard');

//  Use the standard config to lint the incoming content.
const lint = (language, content) => {
    return stylelint.lint({
        syntax: language,
        code: content,
        config: stylelintConfigStandard
    });
};

//  Setup Express application.
const app = express();
app.use(bodyParser.json());

//  Listen on POST /file for requests. These requests are not 100% the same as the one
//  we are receiving in lazy service as language most notably needs to be translated from
//  the client value into stylelint value.
app.post('/file', (req, res) => {
    const language = selectn('body.language', req);
    const content = selectn('body.content', req);
    lint(language, content)
        .then((results) => {
            return _
                .chain(selectn('results[0].warnings', results))
                .map((warning) => {
                    try {
                        return {
                            type: warning.severity,
                            //  Remove the rule string from the final output.
                            message: warning.text.replace(' (' + warning.rule + ')', ''),
                            line: _.toNumber(warning.line),
                            column: _.toNumber(warning.column)
                        };
                    } catch(e) {
                        logger.error('Failed to process stylelint warning', warning);
                    }
                })
                .filter()
                .value();
        })
        .then((warnings) => {
            res.send({
                warnings: warnings
            });
        })
        .catch((err) => {
            console.log('Linting failed', err);
            res.status(500).send({
                error: err.message
            });
        });
});

const port = process.env.PORT || 80;
app.listen(port, () => {
    console.log('`stylelint-server` listening on', port);
});
