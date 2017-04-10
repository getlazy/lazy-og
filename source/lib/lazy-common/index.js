
'use strict';

const PackageLogger = require('./lib/package-logger');

// lazy ignore global-require
module.exports = {
    LazyLoggingLevels: require('./lib/lazy-logging-levels'),
    createPackageLogger: (packageName) => {
        return PackageLogger.create(packageName);
    }
};
