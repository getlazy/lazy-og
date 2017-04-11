'use strict';

require('./bootstrap');

const td = require('testdouble');

const _ = require('lodash');
const assert = require('assert');
const request = require('request');
const rewire = require('rewire');
const EnigeHelpersDouble = td.replace('@getlazy/engine-helpers');
const testModule = rewire('../engine');
const LazyEngineHttpServer = testModule.__get__('LazyEngineHttpServer');


const testCases = require('./fixtures/engine-test-cases');
const otherTestCases = require('./fixtures/other-test-cases');

const testEngineConfig = {
    test: 'value'
};

const resolveIfUndefined = result => (_.isUndefined(result) ? Promise.resolve() : result);

const testThen = (result, test, self) => {
    if (test.then) {
        try {
            return resolveIfUndefined(test.then(result, self))
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
};

const testCatch = (err, test, self) => {
    if (test.catch) {
        try {
            return resolveIfUndefined(test.catch(err, self))
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
};

describe('EngineHttpServer', () => {

    beforeEach(() => {
        td.when(EnigeHelpersDouble.LazyPrivateApiClient.getEngineConfig()).thenReturn(Promise.resolve(testEngineConfig));
    });

    afterEach(() => {
        td.reset();
    });

    describe('beforeListening', () => {

        let testsToRun = _.filter(otherTestCases.beforeListeningTestCases, 'only');
        if (_.isEmpty(testsToRun)) {
            testsToRun = otherTestCases.beforeListeningTestCases;
        }
        _.forEach(testsToRun, (test) => {
            it(test.id, () => {
                if (!_.isFunction(test.then) && !_.isFunction(test.catch)) {
                    throw new Error(`Bad test configuration at '${test.id}'`);
                }

                const engine = new LazyEngineHttpServer();

                const params = test.params || {};
                return engine.beforeListening()
                    .then(result => testThen(result, test, engine))
                    .catch((err) => testCatch(err, test, engine));
            });
        });
    });

    describe('analyzeFile', () => {
        let testsToRun = _.filter(testCases, 'only');
        if (_.isEmpty(testsToRun)) {
            testsToRun = testCases;
        }
        _.forEach(testsToRun, (test) => {
            it(test.id, () => {
                if (!_.isFunction(test.then) && !_.isFunction(test.catch)) {
                    throw new Error(`Bad test configuration at '${test.id}'`);
                }

                const engine = new LazyEngineHttpServer();

                const params = test.params || {};
                return engine.analyzeFile(params.hostPath, params.language, params.content, params.context)
                    .then(result => testThen(result, test))
                    .catch((err) => testCatch(err, test));
            });
        });
    });

    describe('afterListening', () => {
        let testsToRun = _.filter(otherTestCases.afterListeningTestCases, 'only');
        if (_.isEmpty(testsToRun)) {
            testsToRun = otherTestCases.afterListeningTestCases;
        }
        _.forEach(testsToRun, (test) => {
            it(test.id, () => {
                if (!_.isFunction(test.then) && !_.isFunction(test.catch)) {
                    throw new Error(`Bad test configuration at '${test.id}'`);
                }

                const engine = new LazyEngineHttpServer();

                const params = test.params || {};
                return engine.afterListening()
                    .then(result => testThen(result, test))
                    .catch((err) => testCatch(err, test));
            });
        });
    });

    describe('getMeta', () => {
        it('should return empty {}', () => {
            const engine = new LazyEngineHttpServer();

            let meta;
            assert.doesNotThrow(() => {
                meta = engine.getMeta();
            });
            assert(_.isEqual(meta, {}));
        });
    });

    describe('customizeExpressApp', () => {
        it('should not throw', () => {
            const engine = new LazyEngineHttpServer();

            assert.doesNotThrow(() => engine.customizeExpressApp());
        });
    });

});