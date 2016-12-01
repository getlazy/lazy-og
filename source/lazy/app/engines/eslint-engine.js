
'use strict';

const DockerizedHttpEngine = require('../dockerized-http-engine');

const NAME = 'eslint';
const LANGUAGES = ['JavaScript'];
const IMAGE_NAME = 'ierceg/lazy-eslint-engine:latest';

/**
 * Runs ESLint linter through esling-engine.
 * This technique is much faster than executing through a container (see DockerizedContainer).
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

module.exports = new EslintEngine(NAME, LANGUAGES, IMAGE_NAME);
