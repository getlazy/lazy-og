# lazy-engine-container
Universal container for engines implemented in JavaScript/Node.js

## Configuring engines

Instatiate this engine in `engines` section of `lazy.yaml`. The interesting part is in the `config` section:


```
    engine_name:
      ...
      config:    
        packageNPM: '@lazyass/lazy-engineimpl-eslint'
        packageVersion: latest
        npmRegistry: registry.npmjs.org
        npmToken: 'xxxx-yyyy-zzzz-ccccc'     
        packageConfig:
            custom: configuration_object
            ...
      ....

```

* packageNPM:  `required` The name of the NPM package that contains implementation of the engine
* packageVersion: `optional` The version of the above package. Default: `latest`
* npmRegistry: `optional` NPM registry from which to download the package. Default: `registry.npmjs.org`
* npmToken: `optional` User authentication toke to use when connecting to registry
* packageConfig: `optional` Arbitrary configuration object to be passed to engine implementation in boot time. This will passed as `config` object to engine's `configure` function.


An engine implementation is a simple Node.js module that exports certain functions, and is packaged and published either as public of private NPM module. [template/engine-sample.js](./template/engine-sample.js) file contains the stub of engine implementation that can be used as a basis for developing new engines.

