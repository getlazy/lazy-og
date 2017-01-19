
'use strict';

/* global logger, describe, it, before, after, afterEach */

require('./bootstrap');

//  To set some properties we need `this` of `describe` and `it` callback functions.
// lazy ignore prefer-arrow-callback
// lazy ignore func-names

const td = require('testdouble');

const _ = require('lodash');
const EnginePipeline = require('../app/engine-pipeline');
const testCases = require('./fixtures/engine-pipeline-test-cases');

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

                //  This could be done more elegantly but something is screwed up eithe with
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
                                        logger.error(`Bad test '${test.id}' checks`, err);
                                        return Promise.reject(new Error(`Bad test '${test.id}' checks: ${err}`));
                                    });
                            } catch (err) {
                                logger.error(`Bad test '${test.id}' checks`, err);
                                return Promise.reject(new Error(`Bad test '${test.id}' checks: ${err}`));
                            }
                        }

                        logger.error(`Bad test '${test.id}' succeeded with`, result);
                        return Promise.reject(new Error(`Test '${test.id}' is testing for failure`));
                    })
                    .catch((err) => {
                        if (test.catch) {
                            try {
                                return resolveIfUndefined(test.catch(err, engineStatuses))
                                    .catch((err2) => {
                                        logger.error(`Bad test '${test.id}' checks`, err2);
                                        return Promise.reject(new Error(`Bad test '${test.id}' checks: ${err2}`));
                                    });
                            } catch (err3) {
                                logger.error(`Bad test '${test.id}' checks`, err3);
                                return Promise.reject(new Error(`Bad test '${test.id}' checks: ${err3}`));
                            }
                        }

                        logger.error('Bad test failed with', err);
                        return Promise.reject(new Error(`Test '${test.id}' is testing for success, not ${err}`));
                    });
            });
        });
    });
});
