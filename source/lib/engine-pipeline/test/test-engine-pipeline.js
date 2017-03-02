
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
            enginePipeline.on('metrics', (engineId, metrics) => {
                assert.equal(engineId, 'engine1');
                assert(_.isArray(metrics));
                assert.equal(_.size(metrics), 1);
                assert.equal(_.head(metrics).language, 'JavaScript');
                assert.equal(_.head(metrics).rule, 'test');
                metricsIssuedCounter += 1;
            });
            const engineStatuses = [];
            return enginePipeline.analyzeFile('test.js', 'JavaScript', '\'use strict\'', {}, engineStatuses)
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
});
