
'use strict';

/* global logger, describe, it, before, after, afterEach */

require('./bootstrap');

//  To set some properties we need `this` of `describe` and `it` callback functions.
// lazy ignore prefer-arrow-callback
// lazy ignore func-names

const _ = require('lodash');
const assert = require('assert');
const testCases = require('./fixtures/postproc-test-cases');
const regexFixtures = require('./fixtures/regex-test-cases')
const rewire = require('rewire');
const testModule = rewire('../postprocessor-engine');
const PostProcEngineHttpServer = testModule.__get__('PostProcEngineHttpServer');

const resolveIfUndefined = result => (_.isUndefined(result) ? Promise.resolve() : result);

describe('PostProcEngineHttpServer', function () {

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

                const postprocessor = new PostProcEngineHttpServer();

                //  This could be done more elegantly but something is screwed up eithe with
                //  promises or mocha and continuations don't work correctly unless defined
                //  in the same statement with `.analyzeFile()`.
                const params = test.params || {};
                return postprocessor.analyzeFile(
                    params.hostPath, params.language, params.content, params.context)
                    .then((result) => {
                        if (test.then) {
                            try {
                                return resolveIfUndefined(test.then(result))
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
                                return resolveIfUndefined(test.catch(err))
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

    describe('Directives RegEx Parser', function () {
    const postprocessor = new PostProcEngineHttpServer();

    _.forEach(regexFixtures, (fixture) => {
        it(fixture.name, function () {
            const response = postprocessor._parseLine(fixture.comment);
            assert(_.eq(response.commandStr, fixture.expected.commandStr));
            assert(_.isEqual(response.args, fixture.expected.args));
        });
    });
});
});
