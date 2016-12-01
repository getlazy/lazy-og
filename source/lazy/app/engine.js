
'use strict';

/**
 * Base class for all engines.
 */
class Engine
{
    /**
     * Constructs Engine with the given name and languages.
     * @param {string} name Name of the engine
     * @param {Array} languages Array of language strings which this engine can process.
     */
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

    /**
     * Boots the engine.
     * @return {Promise} Promise resolved when boot operation has finished.
     */
    boot() {
        throw new Error('This method must be overriden in the inheriting class.');
    }

    analyzeFile(content, clientPath, language, config) {
        throw new Error('This method must be overriden in the inheriting class.');
    }
}

module.exports = Engine;
