
'use strict';

/* global logger, describe, it, before, after, afterEach */

//  To set some properties we need `this` of `describe` and `it` callback functions.
// lazy ignore prefer-arrow-callback
// lazy ignore func-names

require('./bootstrap');

const td = require('testdouble');

const _ = require('lodash');
const assert = require('assert');
const EnginePipeline = require('../app/engine-pipeline');

const resolveIfUndefined = result => (_.isUndefined(result) ? Promise.resolve() : result);

const TESTS = [{
    id: 'failure #1',
    catch: (err) => {
        assert(err);
        assert.equal(err.message, 'Bad engine pipeline config.');
    }
}, {
    id: 'failure #2',
    pipeline: 12345,
    catch: (err) => {
        assert(err);
        assert.equal(err.message, 'Bad engine pipeline config.');
    }
}, {
    id: 'failure #3',
    pipeline: {},
    catch: (err) => {
        assert(err);
        assert.equal(err.message, 'Bad engine pipeline config.');
    }
}, {
    id: 'failure #4',
    pipeline: {
        engine1: {}
    },
    catch: (err) => {
        assert(err);
        assert.equal(err.message, 'Bad engine pipeline config.');
    }
}, {
    id: 'success #1',
    pipeline: {
        sequence: []
    },
    then: (result) => {
        assert(_.isUndefined(result));
    }
}, {
    id: 'success #2',
    engines: [{
        name: 'engine1',
        languages: [],
        analyzeFile() {
            return Promise.resolve({
                warnings: [{ test: 'result' }]
            });
        }
    }],
    pipeline: {
        sequence: [{
            engine1: {}
        }]
    },
    then: (result) => {
        assert.equal(_.get(result, 'warnings[0].test'), 'result');
    }
}, {
    id: 'inexisting engine in sequence #1',
    engines: [{
        name: 'engine1',
        languages: [],
        analyzeFile() {
            return Promise.resolve({
                warnings: [{ test: 'result' }]
            });
        }
    }],
    pipeline: {
        sequence: [{
            engine1: {}
        }, {
            'inexisting-engine': {}
        }]
    },
    then: (result) => {
        assert.equal(_.get(result, 'warnings[0].test'), 'result');
    }
}, {
    id: 'inexisting engine in sequence #2',
    engines: [{
        name: 'engine1',
        languages: [],
        analyzeFile() {
            return Promise.resolve({
                warnings: [{ test: 'result' }]
            });
        }
    }, {
        name: 'engine2',
        languages: [],
        analyzeFile(hostPath, language, content, context) {
            assert(!_.isUndefined(context.previousStepResults));
            return Promise.resolve({
                warnings: [{ test2: context.previousStepResults }]
            });
        }
    }],
    pipeline: {
        sequence: [{
            engine1: {}
        }, {
            'inexisting-engine': {}
        }, {
            engine2: {}
        }]
    },
    then: (result) => {
        assert.equal(_.get(result, 'warnings[0].test2.warnings[0].test'), 'result');
    }
}, {
    id: 'status are returned in sequence',
    engines: [{
        name: 'engine1',
        languages: [],
        analyzeFile(hostPath, language, content, context) {
            return Promise.resolve({
                warnings: [{ test: 'result' }],
                status: {
                    test: 1
                }
            });
        }
    }, {
        name: 'engine2',
        languages: [],
        analyzeFile(hostPath, language, content, context) {
            assert(!_.isUndefined(context.previousStepResults));
            return Promise.resolve({
                warnings: [{ test2: context.previousStepResults }],
                status: {
                    test: 2
                }
            });
        }
    }],
    pipeline: {
        sequence: [{
            engine1: {}
        }, {
            'inexisting-engine': {}
        }, {
            engine2: {}
        }]
    },
    // lazy ignore-once no-unused-vars
    then: (result, engineStatuses) => {
        assert.equal(_.get(engineStatuses, '[0].test'), 1);
        assert.equal(_.get(engineStatuses, '[1].test'), 2);
    }
}, {
    id: 'inexisting engine in bundle #1',
    engines: [{
        name: 'engine1',
        languages: [],
        analyzeFile() {
            return Promise.resolve({
                warnings: [{ test: 'result' }]
            });
        }
    }],
    pipeline: {
        bundle: [{
            engine1: {}
        }, {
            'inexisting-engine': {}
        }]
    },
    then: (result) => {
        assert.equal(_.get(result, 'warnings[0].test'), 'result');
    }
}, {
    id: 'inexisting engine in bundle #2',
    engines: [{
        name: 'engine1',
        languages: [],
        analyzeFile() {
            return Promise.resolve({
                warnings: [{ test: 'result' }]
            });
        }
    }, {
        name: 'engine2',
        languages: [],
        analyzeFile(hostPath, language, content, context) {
            return Promise.resolve({
                warnings: [{ test: 'result2' }]
            });
        }
    }],
    pipeline: {
        bundle: [{
            engine1: {}
        }, {
            'inexisting-engine': {}
        }, {
            engine2: {}
        }]
    },
    then: (result) => {
        assert(_.isArray(result.warnings), 'warnings is an array');
        assert.equal(result.warnings.length, 2);
        //  Sort the result as bundle engines return be executed out of order.
        const sortedWarnings = _.sortBy(result.warnings, 'test');
        assert.equal(sortedWarnings[0].test, 'result');
        assert.equal(sortedWarnings[1].test, 'result2');
    }
}, {
    id: 'status are returned in bundle',
    engines: [{
        name: 'engine1',
        languages: [],
        analyzeFile(hostPath, language, content, context) {
            return Promise.resolve({
                warnings: [{ test: 'result' }],
                status: {
                    test: 1
                }
            });
        }
    }, {
        name: 'engine2',
        languages: [],
        analyzeFile(hostPath, language, content, context) {
            return Promise.resolve({
                warnings: [{ test: 'result2' }],
                status: {
                    test: 2
                }
            });
        }
    }],
    pipeline: {
        bundle: [{
            engine1: {}
        }, {
            'inexisting-engine': {}
        }, {
            engine2: {}
        }]
    },
    // lazy ignore-once no-unused-vars
    then: (result, engineStatuses) => {
        assert(_.isArray(engineStatuses), 'engineStatuses is an array');
        assert.equal(engineStatuses.length, 2);
        //  Sort the statuses as bundle engines return be executed out of order.
        const sortedStatuses = _.sortBy(engineStatuses, 'test');
        assert.equal(_.get(sortedStatuses, '[0].test'), 1);
        assert.equal(_.get(sortedStatuses, '[1].test'), 2);
    }
}, {
    id: 'composition defect #1 fixed',
    engines: [{
        name: 'engine1',
        languages: [],
        analyzeFile(hostPath, language, content, context) {
            return Promise.resolve({
                warnings: [{ test: 'result' }],
                status: {
                    test: 1
                }
            });
        }
    }, {
        name: 'engine2',
        languages: [],
        analyzeFile(hostPath, language, content, context) {
            assert(!_.isUndefined(context.previousStepResults));
            return Promise.resolve({
                warnings: _.union(context.previousStepResults.warnings, [{ test: 'result2' }]),
                status: {
                    test: 2
                }
            });
        }
    }],
    pipeline: {
        sequence: [{
            engine1: {}
        }, {
            bundle: [{
                engine2: {}
            }]
        }]
    },
    // lazy ignore-once no-unused-vars
    then: (result, engineStatuses) => {
        assert(_.isArray(result.warnings), 'warnings is an array');
        assert.equal(result.warnings.length, 2);
        assert.equal(_.get(result, 'warnings[0].test'), 'result');
        assert.equal(_.get(result, 'warnings[1].test'), 'result2');

        assert(_.isArray(engineStatuses), 'engineStatuses is an array');
        assert.equal(engineStatuses.length, 2);
        assert.equal(_.get(engineStatuses, '[0].test'), 1);
        assert.equal(_.get(engineStatuses, '[1].test'), 2);
    }
}];

describe('EnginePipeline', function () {
    afterEach(() => {
        td.reset();
    });

    describe('analyzeFile', function () {
        let testsToRun = _.filter(TESTS, 'only');
        if (_.isEmpty(testsToRun)) {
            testsToRun = TESTS;
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
