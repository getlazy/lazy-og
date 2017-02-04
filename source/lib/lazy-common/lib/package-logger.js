
'use strict';

const EventEmitter = require('events');

const packagesRegistry = {};

class PackageLogger extends EventEmitter {
    constructor(packageName) {
        super();
        this._packageName = packageName;
    }

    static create(packageName) {
        let logger = packagesRegistry[packageName];
        if (logger) {
            return logger;
        }

        logger = new PackageLogger(packageName);
        packagesRegistry[packageName] = logger;
        return logger;
    }

    log(level, ...args) {
        this.emit('log', level, this._packageName, ...args);
    }

    error(...args) {
        this.log('error', ...args);
    }

    warn(...args) {
        this.log('warn', ...args);
    }

    info(...args) {
        this.log('info', ...args);
    }

    verbose(...args) {
        this.log('verbose', ...args);
    }

    debug(...args) {
        this.log('debug', ...args);
    }

    silly(...args) {
        this.log('silly', ...args);
    }
}

module.exports = PackageLogger;
