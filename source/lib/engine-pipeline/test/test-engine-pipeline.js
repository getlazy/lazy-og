
'use strict';

/* global describe, it, before, after, afterEach */

//  To set some properties we need `this` of `describe` and `it` callback functions.
// lazy ignore prefer-arrow-callback func-names no-console

const td = require('testdouble');

const _ = require('lodash');
const EnginePipeline = require('../lib/engine-pipeline');
const testCases = require('./fixtures/engine-pipeline-test-cases');
const assert = require('assert');

const resolveIfUndefined = result => (_.isUndefined(result) ? Promise.resolve() : result);

describe('EnginePipeline', function () {
    afterEach(() => {
        td.reset();
    });

    describe('analyzeFile', function () {
        let testsToRun = _.filter(testCases, 'only');
        if (_.isEmpty(testsToRun)) {
            testsToRun = testCases;
        }
        _.forEach(testsToRun, (test) => {
            it(test.id, function () {
                if (!_.isFunction(test.then) && !_.isFunction(test.catch)) {
                    throw new Error(`Bad test configuration at '${test.id}'`);
                }

                const pipeline = new EnginePipeline(test.engines, test.pipeline);

                //  This could be done more elegantly but something is screwed up either with
                //  promises or mocha and continuations don't work correctly unless defined
                //  in the same statement with `.analyzeFile()`.
                const engineStatuses = [];
                const params = test.params || {};
                return pipeline.analyzeFile(
                    params.hostPath, params.language, params.content, params.context, engineStatuses)
                    .then((result) => {
                        if (test.then) {
                            try {
                                return resolveIfUndefined(test.then(result, engineStatuses))
                                    .catch((err) => {
                                        console.error(`Bad test '${test.id}' checks`, err);
                                        return Promise.reject(new Error(`Bad test '${test.id}' checks: ${err}`));
                                    });
                            } catch (err) {
                                console.error(`Bad test '${test.id}' checks`, err);
                                return Promise.reject(new Error(`Bad test '${test.id}' checks: ${err}`));
                            }
                        }

                        console.error(`Bad test '${test.id}' succeeded with`, result);
                        return Promise.reject(new Error(`Test '${test.id}' is testing for failure`));
                    })
                    .catch((err) => {
                        if (test.catch) {
                            try {
                                return resolveIfUndefined(test.catch(err, engineStatuses))
                                    .catch((err2) => {
                                        console.error(`Bad test '${test.id}' checks`, err2);
                                        return Promise.reject(new Error(`Bad test '${test.id}' checks: ${err2}`));
                                    });
                            } catch (err3) {
                                console.error(`Bad test '${test.id}' checks`, err3);
                                return Promise.reject(new Error(`Bad test '${test.id}' checks: ${err3}`));
                            }
                        }

                        console.error('Bad test failed with', err);
                        return Promise.reject(new Error(`Test '${test.id}' is testing for success, not ${err}`));
                    });
            });
        });

        it('metrics are emitted', function () {
            const engines = [{
                id: 'engine1',
                languages: ['JavaScript'],
                analyzeFile() {
                    return Promise.resolve({
                        warnings: [{ test: 'result' }],
                        metrics: [{
                            language: 'JavaScript',
                            rule: 'test'
                        }],
                        status: {
                            test: 1
                        }
                    });
                }
            }];
            const pipeline = {
                sequence: [{
                    engine1: {}
                }]
            };
            const enginePipeline = new EnginePipeline(engines, pipeline);
            let metricsIssuedCounter = 0;
            enginePipeline.on('metrics', (metrics) => {
                assert(_.isArray(metrics));
                assert.equal(_.size(metrics), 1);
                const metric = _.head(metrics);
                assert.equal(metric.engineId, 'engine1');
                assert.equal(metric.hostPath, 'test.js');
                assert.equal(metric.language, 'javascript');
                assert.equal(metric.detectedLanguage, 'javascript');
                assert.equal(metric.rule, 'test');
                assert.equal(metric.hostname, 'test-hostname');
                assert.equal(metric.repository.owner, 'test-owner');
                assert.equal(metric.repository.name, 'test-repository');
                assert.equal(metric.branch, 'test-branch');
                assert.equal(metric.client, 'test-client');
                metricsIssuedCounter += 1;
            });
            const engineStatuses = [];
            return enginePipeline.analyzeFile('test.js', 'JavaScript', '\'use strict\'', {
                hostname: 'test-hostname',
                client: 'test-client',
                repositoryInformation: {
                    status: {
                        current: 'test-branch'
                    },
                    remotes: [{
                        name: 'test1',
                        refs: {
                            fetch: 'test1-repo'
                        }
                    }, {
                        name: 'upstream',
                        refs: {
                            fetch: 'test-upstream-repo'
                        }
                    },
                    {
                        name: 'origin',
                        refs: {
                            fetch: 'https://github.com/test-owner/test-repository.git'
                        }
                    }]
                }
            }, engineStatuses)
                .then((result) => {
                    assert(_.isArray(result.warnings));
                    assert.equal(_.size(result.warnings), 1);
                    assert(result.status);
                    assert.equal(result.status.test, 1);
                    assert(!result.metrics);
                    assert.equal(metricsIssuedCounter, 1);
                });
        });
    });

    it('_remotesComparator', function () {
        const test1 = {
            name: 'test1',
            refs: {
                fetch: 'test1-repo'
            }
        };
        const test2 = {
            name: 'test2',
            refs: {
                fetch: 'test2-repo'
            }
        };
        const upstream = {
            name: 'upstream',
            refs: {
                fetch: 'test-upstream-repo'
            }
        };
        const origin = {
            name: 'origin',
            refs: {
                fetch: 'test-origin-repo'
            }
        };
        const empty = {};
        assert.equal(EnginePipeline._remotesComparator(test1, origin), 1);
        assert.equal(EnginePipeline._remotesComparator(test2, origin), 1);
        assert.equal(EnginePipeline._remotesComparator(empty, origin), 1);
        assert.equal(EnginePipeline._remotesComparator(upstream, origin), 1);
        assert.equal(EnginePipeline._remotesComparator(origin, origin), 0);
        assert.equal(EnginePipeline._remotesComparator(test1, upstream), 1);
        assert.equal(EnginePipeline._remotesComparator(test2, upstream), 1);
        assert.equal(EnginePipeline._remotesComparator(empty, upstream), 1);
        assert.equal(EnginePipeline._remotesComparator(origin, upstream), -1);
        assert.equal(EnginePipeline._remotesComparator(upstream, upstream), 0);
        assert.equal(EnginePipeline._remotesComparator(upstream, test1), -1);
        assert.equal(EnginePipeline._remotesComparator(test2, test1), 1);
        assert.equal(EnginePipeline._remotesComparator(empty, test1), 1);
        assert.equal(EnginePipeline._remotesComparator(origin, test1), -1);
        assert.equal(EnginePipeline._remotesComparator(test1, test1), 0);
        assert.equal(EnginePipeline._remotesComparator(upstream, test2), -1);
        assert.equal(EnginePipeline._remotesComparator(test1, test2), -1);
        assert.equal(EnginePipeline._remotesComparator(empty, test2), 1);
        assert.equal(EnginePipeline._remotesComparator(origin, test2), -1);
        assert.equal(EnginePipeline._remotesComparator(test2, test2), 0);
        assert.equal(EnginePipeline._remotesComparator(test1, empty), -1);
        assert.equal(EnginePipeline._remotesComparator(test2, empty), -1);
        assert.equal(EnginePipeline._remotesComparator(upstream, empty), -1);
        assert.equal(EnginePipeline._remotesComparator(origin, empty), -1);
        assert.equal(EnginePipeline._remotesComparator(empty, empty), 0);
    });

    it('_getRepositoryNameFromFetch', function () {
        assert.equal(EnginePipeline._getRepositoryNameFromFetch(), undefined);
        assert.equal(EnginePipeline._getRepositoryNameFromFetch(null), null);
        assert.equal(EnginePipeline._getRepositoryNameFromFetch(1), 1);
        assert.equal(EnginePipeline._getRepositoryNameFromFetch('test'), 'test');
        assert.deepEqual(EnginePipeline._getRepositoryNameFromFetch(
            'https://github.com/test-owner/test-repo.git'), { owner: 'test-owner', name: 'test-repo' });
        assert.deepEqual(EnginePipeline._getRepositoryNameFromFetch(
            'git@github.com:test-owner/test-repo.git'), { owner: 'test-owner', name: 'test-repo' });
    });
});
