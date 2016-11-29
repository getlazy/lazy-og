
'use strict';

/**
 * Base class for all engines.
 */
class Engine
{
    constructor(name, languages) {
        this._name = name;
        this._languages = languages;
    }

    get name() {
        return this._name;
    }

    get languages() {
        return this._languages;
    }

    boot() {
        throw new Error('This method must be overriden in the inheriting class.');
    }

    analyzeFile(content, clientPath, language, config) {
        throw new Error('This method must be overriden in the inheriting class.');
    }
}

module.exports = Engine;
