
'use strict';

/* global logger, describe, it, before, after, afterEach */

//  To set some properties we need `this` of `describe` and `it` callback functions.
// lazy ignore prefer-arrow-callback func-names class-methods-use-this lodash/preferred-alias
// lazy ignore lodash/import-scope
// lazy ignore no-template-curly-in-string ; we use template curly in strings in our yaml

const _ = require('lodash');
const assert = require('assert');
const LazyConfigFile = require('../lib/lazy-config-file');
const configTests = require('./fixtures/lazy-config-file-config-tests');
const nock = require('nock');
const path = require('path');

describe('LazyConfigFile', function () {
    describe('load', function () {
        it('works with paths', function () {
            return LazyConfigFile.load(path.resolve(path.resolve(), 'test/fixtures/valid-yaml-config-test.yaml'));
        });

        it('works with urls', function () {
            const lazyTeamConfig = {
                version: 1,
                service_url: 'http://a.co',
                engine_pipeline: {
                    sequence: [{
                        test: {}
                    }]
                },
                engines: {
                    test: {
                        image: 'a:b'
                    }
                }
            };

            const testRequest = nock('http://example.com')
                .get('/lazy-team-config.yaml')
                .reply(200, lazyTeamConfig);

            return LazyConfigFile.load('http://example.com/lazy-team-config.yaml')
                .then((config) => {
                    assert(testRequest.isDone());
                    assert.deepEqual(config, lazyTeamConfig);
                });
        });
    });

    describe('_getConfigErrors', function () {
        _.each(configTests, (test) => {
            it(`schema check test ${test.id}`, function () {
                const errors = LazyConfigFile._getConfigErrors(test.config);
                if (test.firstErrorMessage) {
                    assert(errors);
                    assert.equal(_.first(errors).message, test.firstErrorMessage);
                } else {
                    assert(!errors);
                }
            });
        });
    });

    describe('_interpolateEnvvars', function () {
        it('value is not a string', function () {
            assert.deepEqual(LazyConfigFile._interpolateEnvvars(), undefined);
            assert.deepEqual(LazyConfigFile._interpolateEnvvars({ test: 1 }), { test: 1 });
            assert.deepEqual(LazyConfigFile._interpolateEnvvars([1, 2, 3]), [1, 2, 3]);
            assert.deepEqual(LazyConfigFile._interpolateEnvvars(12345), 12345);
            assert.deepEqual(LazyConfigFile._interpolateEnvvars(true), true);
        });

        it('value is plain string', function () {
            assert.deepEqual(LazyConfigFile._interpolateEnvvars(''), '');
            assert.deepEqual(LazyConfigFile._interpolateEnvvars('test'), 'test');
            assert.deepEqual(LazyConfigFile._interpolateEnvvars('test:default'), 'test:default');
            assert.deepEqual(LazyConfigFile._interpolateEnvvars('${test'), '${test');
            assert.deepEqual(LazyConfigFile._interpolateEnvvars('test}'), 'test}');
        });

        it('value is interpolated string but no envvar', function () {
            assert.deepEqual(LazyConfigFile._interpolateEnvvars('${TEST_THIS_ENVVAR}'), undefined);
            assert.deepEqual(LazyConfigFile._interpolateEnvvars('${TEST_THIS_ENVVAR:default test value}'), 'default test value');
        });

        it('value is interpolated string and envvar', function () {
            process.env.TEST_VALUE = 'test value';
            assert.deepEqual(LazyConfigFile._interpolateEnvvars('${TEST_VALUE}'), process.env.TEST_VALUE);
            assert.deepEqual(LazyConfigFile._interpolateEnvvars('${TEST_VALUE:default test value}'), process.env.TEST_VALUE);
        });
    });

    describe('_expandMacros', function () {
        describe('config is not an object', function () {
            it('test undefined', function () {
                return LazyConfigFile._expandMacros('test').then(value => assert.deepEqual(value, undefined));
            });

            it('test string', function () {
                return LazyConfigFile._expandMacros('test', '{ test: 1 }').then(value => assert.deepEqual(value, '{ test: 1 }'));
            });

            it('test array', function () {
                return LazyConfigFile._expandMacros('test', [1, 2, 3]).then(value => assert.deepEqual(value, [1, 2, 3]));
            });

            it('test number', function () {
                return LazyConfigFile._expandMacros('test', 12345).then(value => assert.deepEqual(value, 12345));
            });

            it('test boolean', function () {
                return LazyConfigFile._expandMacros('test', true).then(value => assert.deepEqual(value, true));
            });
        });

        describe('config is a plain object with no macros', function () {
            it('flat object', function () {
                return LazyConfigFile._expandMacros('test', { test: 'test' })
                    .then(value => assert.deepEqual(value, { test: 'test' }));
            });

            it('two level object', function () {
                const test = {
                    level1: [{
                        level2: 12345
                    }]
                };
                return LazyConfigFile._expandMacros('test', test).then(value => assert.deepEqual(value, test));
            });

            it('multilevel level object', function () {
                const test = {
                    level1: [{
                        level2: {
                            level3: {
                                level4: [1, 2, 3]
                            }
                        }
                    }]
                };
                return LazyConfigFile._expandMacros('test', test).then(value => assert.deepEqual(value, test));
            });
        });

        describe('config is a plain object with ~include macros', function () {
            it('fails on bad file name', function () {
                const test = {
                    '~include': 'test.yaml'
                };
                return LazyConfigFile._expandMacros('test', test)
                    .then(() => assert(false))
                    .catch(err => assert(_.startsWith(err.message, 'ENOENT: no such file or directory')));
            });

            it('complete ~include replacement', function () {
                const test = {
                    '~include': 'fixtures/yaml-include-macro-test-1.yaml'
                };
                return LazyConfigFile._expandMacros('test', test)
                    .then((config) => {
                        assert.deepEqual(config, { test: 'this' });
                    });
            });

            it('~include in the middle', function () {
                const test = {
                    config: {
                        '~include': 'fixtures/yaml-include-macro-test-1.yaml',
                        not: 'replaced',
                        test: 'is replaced'
                    }
                };
                return LazyConfigFile._expandMacros('test', test)
                    .then((config) => {
                        assert.deepEqual(config, {
                            config: {
                                test: 'this',
                                not: 'replaced'
                            }
                        });
                    });
            });

            it('multiple ~include in the middle', function () {
                const test = {
                    config: {
                        '~include': 'fixtures/yaml-include-macro-test-1.yaml',
                        level1: [null, 12345, [true, {
                            '~include': 'fixtures/yaml-include-macro-test-2.yaml'
                        }, 'test'], undefined]
                    }
                };
                return LazyConfigFile._expandMacros('test', test)
                    .then((config) => {
                        assert.deepEqual(config, {
                            config: {
                                test: 'this',
                                level1: [null, 12345, [true, {
                                    example: 2
                                }, 'test'], undefined]
                            }
                        });
                    });
            });

            it('nested ~include', function () {
                const test = {
                    config: {
                        not: 'replaced',
                        '~include': 'fixtures/yaml-include-macro-test-3.yaml'
                    }
                };
                return LazyConfigFile._expandMacros('test', test)
                    .then((config) => {
                        assert.deepEqual(config, {
                            config: {
                                not: 'replaced',
                                test: 'this',
                                level2: {
                                    example: 2
                                }
                            }
                        });
                    });
            });

            it('~include with envvar interpolation', function () {
                process.env.TEST_THIS_ENVVAR = 'test envvar';
                process.env.TEST_INCLUDE_PATH = 'fixtures/yaml-include-macro-test-1.yaml';
                const test = {
                    config: {
                        not: 'replaced',
                        yes1: '${TEST_THIS_ENVVAR}',
                        yes2: '${TEST_THIS_ENVVAR:default not used}',
                        yes3: '${NO_DEFINITION_ENVVAR}',
                        yes4: '${NO_DEFINITION_ENVVAR:xyz}',
                        '~include': 'fixtures/yaml-include-macro-test-4.yaml'
                    }
                };
                return LazyConfigFile._expandMacros('test', test)
                    .then((config) => {
                        assert.deepEqual(config, {
                            config: {
                                not: 'replaced',
                                yes1: 'test envvar',
                                yes2: 'test envvar',
                                yes3: undefined,
                                yes4: 'xyz',
                                level1: {
                                    test: 'this'
                                }
                            }
                        });
                    });
            });

            it('~include of a URL', function () {
                const testConfig = {
                    '~include': 'http://example.com/lazy-team-config.yaml'
                };
                const lazyTeamConfig = {
                    test: {
                        from: {
                            afar: []
                        }
                    }
                };

                const testRequest = nock('http://example.com')
                    .get('/lazy-team-config.yaml')
                    .reply(200, lazyTeamConfig);

                return LazyConfigFile._expandMacros('test', testConfig)
                    .then((config) => {
                        assert(testRequest.isDone());
                        assert.deepEqual(config, lazyTeamConfig);
                    });
            });
        });
    });
});
