
'use strict';

const path = require('path');
const yaml = require('js-yaml');
const EngineHelpers = require('@lazyass/engine-helpers');

const EngineHttpServer = EngineHelpers.EngineHttpServer;

//  We are implicitly using `this` in overridden methods but lazy keep telling us not to.
/* eslint class-methods-use-this: off */
class YamlEngineHttpServer extends EngineHttpServer {
    _processMsg(type, message) {
        return {
            type,
            message: message.reason,
            line: message.mark.line,
            column: message.mark.column
        };
    }

    /**
     * Analyzes the given YAML file content through js-yaml parser.
     * @param {string} hostPath Path of the source file requesting lazy to analyze.
     * @param {string} language Language of the source file.
     * @param {string} content Content of the source file requesting lazy to analyze.
     * @return {Promise} Promise resolving with results of the file analysis.
     */
    analyzeFile(hostPath, language, content) {
        const self = this;
        //  We use a promise as we get any exceptions wrapped up as failures.
        return new Promise((resolve) => {
            const warnings = [];

            try {
                yaml.safeLoad(content, () => ({}), {
                    filename: path.basename(hostPath),
                    onWarning: (warning) => {
                        warnings.push(self._processMsg('Warning', warning));
                    }
                });
            } catch (error) {
                warnings.push(self._processMsg('Error', error));
            }
            resolve({
                warnings
            });
        });
    }

    getMeta() {
        return {
            languages: ['yaml', 'json']
        };
    }
}

class Engine {
    start() {
        const port = process.env.PORT || 80;
        this._server = new YamlEngineHttpServer(port);
        return this._server.start();
    }

    stop() {
        return this._server.stop()
            .then(() => {
                this._server = null;
            });
    }
}

module.exports = Engine;
