
'use strict';

const DockerizedHttpEngine = require('../dockerized-http-engine');

const NAME = 'eslint';
const LANGUAGES = ['JavaScript'];

/**
 * Runs stylelint linter through stylelint-server HTTP server.
 * This technique is much faster than executing through a container (see DockerizedContainer)
 * as stylelint takes long time to run due to slow loading but if we keep it loaded in HTTP server
 * the response times are two order of magnitude better.
 */
class EslintEngine extends DockerizedHttpEngine
{
    /**
     * Overriden from DockerizedHttpEngine class.
     */
    get port() {
        return process.env.ESLINT_SERVER_PORT || 80;
    }
}

module.exports = new EslintEngine(NAME, LANGUAGES);
