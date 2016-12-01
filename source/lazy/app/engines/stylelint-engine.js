
'use strict';

const DockerizedHttpEngine = require('../dockerized-http-engine');

const NAME = 'stylelint';
const LANGUAGES = ['scss', 'less', 'sugarss'];
const IMAGE_NAME = 'ierceg/lazy-stylelint-engine:latest';

/**
 * Runs stylelint linter through stylelint-engine.
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
        return process.env.STYLELINT_SERVER_PORT || 80;
    }
}

module.exports = new StylelintEngine(NAME, LANGUAGES, IMAGE_NAME);
