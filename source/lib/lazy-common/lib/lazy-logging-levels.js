
'use strict';

// Based on npm logging levels but with more space to add additional future logging levels
// like "metric".
const LazyLoggingLevels = {
    levels: {
        error: 0,
        warn: 10,
        info: 20,
        // `metric` is a special logging level which we use to log all our explicit metrics.
        metric: 25,
        verbose: 30,
        debug: 40,
        silly: 50
    },
    colors:
    {
        error: 'red',
        warn: 'yellow',
        info: 'green',
        metric: 'grey',
        verbose: 'cyan',
        debug: 'blue',
        silly: 'magenta'
    }
};

module.exports = LazyLoggingLevels;
