
'use strict';

/**
 * Base class for all engines.
 */
class Engine
{
    /**
     * Constructs a new instance of Engine with the given name and languages.
     * @param {string} name Name of the engine
     * @param {Array} languages Array of language strings which this engine can process.
     */
    constructor(name, languages) {
        this._name = name;
        this._languages = languages;
    }

    /**
     * @return {string} Name of this engine, used for descriptive purposes.
     */
    get name() {
        return this._name;
    }

    /**
     * @return {Array} Array of strings with languages that this engine can analyze.
     */
    get languages() {
        return this._languages;
    }

    // lazy next -jsdoc-no-return - TODO: Make lazy understand this and turn off the warning.
    /**
     * Boots the engine.
     * @return {Promise} Promise resolved when boot operation has finished.
     */
    boot() {
        throw new Error('This method must be overriden in the inheriting class.');
    }

    // lazy next -jsdoc-no-return - TODO: Make lazy understand this and turn off the warning.
    /**
     * Analyzes the given file content for the given language and analysis configuration.
     * This method must be overriden by the inheriting classes.
     * @param {string} content Content of the source file requesting lazy to analyze.
     * @param {string} clientPath Path of the source file requesting lazy to analyze.
     * @param {string} language Language of the source file.
     * @param {string} config Name of the configuration to use.
     * @return {Promise} Promise resolving with results of the file analysis.
     */
    analyzeFile(content, clientPath, language, config) {
        throw new Error('This method must be overriden in the inheriting class.');
    }
}

module.exports = Engine;
