# lazy-common
Common libraries and utilities for lazy

## `LazyLoggingLevels`

Using this object ensures consistent logging levels across all lazy processes running in Node.

Use:

```js
const common = require('@getlazy/common');
const winston = require('winston');

winston.addColors(common.LazyLoggingLevels.colors);
const logger = new winston.Logger({
    // ...
    levels: common.LazyLoggingLevels.levels
});
```

## `PackageLogger`

External packages cannot know if `logger` exists on the global level nor what are its levels. This replaces such logging efforts with emitting `log` events and leaving it to the package's user to listen to these events.

Use:

```js
const common = require('@getlazy/common');
const logger = common.createLogger('my-package'); // We never assign this `logger` to `global` as that would overwrite application's `global.logger`.

// ...

logger.info('Succeeded marvelously.'); // This will emit `log` event. For users to listen to it logger needs to be exported from the package (see next example)
```

Forwarding log events:

```js
const myPackage = require('my-package');
// This now forwards log events from my-package to Winston.
myPackage.logger.on('log', (level, packageName, ...args) => {
    // In this example we put the package name into meta, if such exists.
    const argsWithoutMeta = [...args];
    const meta = argsWithoutMeta.pop();
    if (typeof(meta) === 'object') { // Nah, not really, use lodash!
        if (!meta._packageName) {
            meta._packageName = packageName;
        }
    }
    logger.log(level, ...messages, meta);
})
```
