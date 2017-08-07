'use strict';

/* global logger, before, after, describe, it */

// lazy ignore func-names global-require prefer-arrow-callback

const _ = require('lodash');
const assert = require('assert');
const request = require('request');

const ASSERT_FALSE = (data) => {
    logger.error(data);
    assert(false);
};

const ANALYZE_FILE_FIXTURE = [{
    name: '200 - YAML (error)',
    params: {
        path: '/src/test.yaml',
        language: 'YAML',
        content: 'a: "b'
    },
    then: (results) => {
        const warnings = results.warnings;
        assert.equal(warnings.length, 1);
        const warningsPerType = _.groupBy(warnings, warning => warning.type);

        assert.equal(warningsPerType.Error.length, 1);
        assert(warnings[0].message.endsWith('unexpected end of the stream within a double quoted scalar'));
    },
    catch: ASSERT_FALSE
}, {
    name: '200 - YAML',
    params: {
        path: '/src/test.yaml',
        language: 'JavaScript',
        content: `
# If you wish to access your private NPM repository of ESLint plugins, enter you NPM token below.
# Otherwise, set NPM_TOKEN to 'public' and you'll be able to install only public NPM repositories
env-vars:
 NPM_TOKEN: 'public'

# All of the rule sets should be descendents of the rule-sets: object
rule-sets:
  - error: below
  error

`
    },
    then: (results) => {
        const warnings = results.warnings;
        assert.equal(warnings.length, 1);
        const warningsPerType = _.groupBy(warnings, warning => warning.type);

        assert.equal(warningsPerType.Error.length, 1);
        assert(warnings[0].message.endsWith('bad indentation of a mapping entry'));
    },
    catch: ASSERT_FALSE
}, {
    name: '200 - JSON',
    params: {
        path: '/src/test.json',
        language: 'JSON',
        content: `
{
  "name": "atom-lazy-linter",
  "main": "./lib/atom-lazy-linter",
  "version": "0.2.2",
  "description": "lazy plugin for Atom Linter",
  "keywords": [
    "lazy",
    "linter"
  ],
  "repository": "https://github.com/getlazy/lazy",
  "license": "MIT",
  "engines": {
    "atom": ">=1.0.0 <2.0.0"
  },
  "dependencies": {
    "async": "^2.1.4",
    "atom-package-deps": "^4.3.1",
    "escape-html": "^1.0.3",
    "lodash": "^4.17.2",
    "request": "^2.78.0",
    "simple-git": "^1.65.0"
  },
  "providedServices": {
    "linter": {
      "versions": {
        "1.0.0": "provideLinter"
      }
    }
  },
  "package-deps": [
    "linter"
  ]
}

`
    },
    then: (results) => {
        const warnings = results.warnings;
        assert.equal(warnings.length, 0);
    },
    catch: ASSERT_FALSE
}, {
    name: '200 - JSON (error)',
    params: {
        path: '/src/test.json',
        language: 'JSON',
        content: `
{
  "providedServices": {
    "linter": {
      "versions" {
        "1.0.0": "provideLinter"
      }
    }
  },
  "package-deps": [
    "linter"
  ]
}

`
    },
    then: (results) => {
        const warnings = results.warnings;
        assert.equal(warnings.length, 1);
        const warningsPerType = _.groupBy(warnings, warning => warning.type);
        assert.equal(warningsPerType.Error.length, 1);
        assert(warnings[0].message.endsWith('missed comma between flow collection entries'));
    },
    catch: ASSERT_FALSE
}];

describe('YamlEngineHttpServer', function () {
    this.timeout(20000);

    before(function () {
        return require('./bootstrap').start();
    });

    after(function () {
        return require('./bootstrap').stop();
    });

    describe('POST /file', function () {
        let onlyFixtures = _.filter(ANALYZE_FILE_FIXTURE, fixture => fixture.only);
        if (_.isEmpty(onlyFixtures)) {
            onlyFixtures = ANALYZE_FILE_FIXTURE;
        }
        _.each(onlyFixtures, (fixture) => {
            const params = fixture.params;
            it(fixture.name, function () {
                const requestParams = {
                    method: 'POST',
                    url: 'http://localhost/file',
                    json: true,
                    headers: {
                        Accept: 'application/json'
                    },
                    body: {
                        hostPath: params.path,
                        content: params.content,
                        language: params.language
                    }
                };

                return new Promise((resolve, reject) => {
                    request(requestParams, (err, response, body) => {
                        if (err) {
                            return reject(err);
                        }

                        if (response.statusCode !== 200) {
                            let message = `HTTP engine failed with ${response.statusCode} status code`;
                            if (body && body.error) {
                                message += ` (${body.error})`;
                            }

                            return reject(new Error(message));
                        }

                        return resolve(body);
                    });
                })
                    .then(fixture.then)
                    .catch(fixture.catch);
            });
        });
    });
});
