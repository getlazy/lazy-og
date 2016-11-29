
'use strict';

const _ = require('lodash');
const selectn = require('selectn');

const DockerizedHttpEngine = require('../lib/dockerized-http-engine');

const NAME = 'stylelint';
const LANGUAGES = ['scss', 'less', 'sugarss'];

require('enforce-envvars')(['STYLELINT_SERVER_PORT']);

/**
 * Runs stylelint linter through stylelint-server HTTP server.
 * This technique is much faster than executing through a container (see DockerizedContainer)
 * as stylelint takes long time to run due to slow loading but if we keep it loaded in HTTP server
 * the response times are two order of magnitude better.
 */
class StylelintEngine extends DockerizedHttpEngine
{
    /**
     * Overriden from DockerizedHttpEngine class.
     */
    get port() {
        return process.env.STYLELINT_SERVER_PORT;
    }

    /**
     * Overriden from DockerizedHttpEngine class.
     */
    _processEngineOutput(results) {
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
    }
}

module.exports = new StylelintEngine(NAME, LANGUAGES);
