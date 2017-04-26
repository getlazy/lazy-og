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
          packageNPM: '@getlazy/eslint-engine-strategy'
          packageName: '@getlazy/eslint-engine-strategy'
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
* packageName: `optional` The name of the package. If ommited, equals to `packageNPM`. Use for importing local packages during development (see below)
* npmRegistry: `optional` NPM registry from which to download the package. Default: `registry.npmjs.org`
* packageConfig: `optional` Arbitrary configuration object to be passed to engine implementation in boot time. This will passed as `config` object to engine's `configure` function.

An engine implementation is a simple Node.js module that exports certain functions, and is packaged and published either as public of private NPM module. [template/engine-sample.js](./template/engine-sample.js) file contains the stub of engine implementation that can be used as a basis for developing new engines.

## Local packages
This engine loads a separate NPM module that implements particular tasks. This loading is performed on boot, and stratagy implementation module should be packaged and deployed to a public or private NPM registry. However, this is inconvenient during the development of the strategy as it would require constant building and publishing of temporary NPM modules. To ease this, you can import strategies from local volume mounted in a container that runs this engine. For example (in `lazy.yaml`):

```
engines:
  engine_name:
    # boot-time-config
    config:
      # A local folder is mounted as /eng/ in the container, 
      # and the strategy is in javascript-engine-strategy subfolder.
      # Name of the strategy module is defined as @getlazy/javascript-engine-strategy in package.json
      packageNPM: 'file:/eng/javascript-engine-strategy/' 
      packageName: '@getlazy/javascript-engine-strategy'
      packageConfig:
        ...

```