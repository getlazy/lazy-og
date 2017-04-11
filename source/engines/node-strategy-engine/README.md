# node-strategy-engine
Engine for engine strategies implemented in JavaScript/Node.js

## Configuring engines

Instantiate this engine in `engines` section of `lazy.yaml`. The interesting part is in the `config` section:

```
    engine_name:
      ...
      import_env:
          - NPM_TOKEN
      config:
          packageNPM: '@getlazy/lazy-engineimpl-eslint'
          packageVersion: latest
          npmRegistry: registry.npmjs.org
          packageConfig:
              custom: configuration_object
              ...
      ...
```

* NPM_TOKEN: `optional` User authentication token to use when connecting to registry, read from environment to avoid leaking it through config files. Default: 'public'
* packageNPM:  `required` The name of the NPM package that contains implementation of the engine
* packageVersion: `optional` The version of the above package. Default: `latest`
* npmRegistry: `optional` NPM registry from which to download the package. Default: `registry.npmjs.org`
* packageConfig: `optional` Arbitrary configuration object to be passed to engine implementation in boot time. This will passed as `config` object to engine's `configure` function.

An engine implementation is a simple Node.js module that exports certain functions, and is packaged and published either as public of private NPM module. [template/engine-sample.js](./template/engine-sample.js) file contains the stub of engine implementation that can be used as a basis for developing new engines.

