
'use strict';

/* global describe, it */

const _ = require('lodash');
const assert = require('assert');
const PackageLogger = require('../lib/package-logger');

describe('PackageLogger', function () {
    describe('create', function () {
        it('creates new loggers', function () {
            const logger = PackageLogger.create('test-logger');
            assert(logger);
        });

        it('returns the same logger for same package name', function () {
            const logger = PackageLogger.create('test-logger');
            assert(logger);
            const logger2 = PackageLogger.create('test-logger');
            assert(logger2);
            assert.equal(logger, logger2);
        });

        it('returns different loggers for different package names', function () {
            const logger1 = PackageLogger.create('test-logger1');
            assert(logger1);
            const logger2 = PackageLogger.create('test-logger2');
            assert(logger2);
            assert.notEqual(logger1, logger2);
        });
    });

    describe('emit events', function () {
        it('on error', function (done) {
            const testLogger = PackageLogger.create('test-logger-error');
            testLogger.on('log', (level, packageName, ...args) => {
                assert.equal(level, 'error');
                assert.equal(packageName, 'test-logger-error');
                const argsWithoutMeta = [...args];
                const meta = argsWithoutMeta.pop();
                assert.deepEqual(argsWithoutMeta, ['test', 'several', 'messages', 'and']);
                assert.deepEqual(meta, { meta: 'test' });
                done();
            });
            testLogger.error('test', 'several', 'messages', 'and', { meta: 'test' });
        });

        it('on warn', function (done) {
            const testLogger = PackageLogger.create('test-logger-warn');
            testLogger.on('log', (level, packageName, ...args) => {
                assert.equal(level, 'warn');
                assert.equal(packageName, 'test-logger-warn');
                const argsWithoutMeta = [...args];
                const meta = argsWithoutMeta.pop();
                assert.deepEqual(argsWithoutMeta, ['test', 'several', 'messages', 'and']);
                assert.deepEqual(meta, { meta: 'test' });
                done();
            });
            testLogger.warn('test', 'several', 'messages', 'and', { meta: 'test' });
        });

        it('on info', function (done) {
            const testLogger = PackageLogger.create('test-logger-info');
            testLogger.on('log', (level, packageName, ...args) => {
                assert.equal(level, 'info');
                assert.equal(packageName, 'test-logger-info');
                const argsWithoutMeta = [...args];
                const meta = argsWithoutMeta.pop();
                assert.deepEqual(argsWithoutMeta, ['test', 'several', 'messages', 'and']);
                assert.deepEqual(meta, { meta: 'test' });
                done();
            });
            testLogger.info('test', 'several', 'messages', 'and', { meta: 'test' });
        });

        it('on verbose', function (done) {
            const testLogger = PackageLogger.create('test-logger-verbose');
            testLogger.on('log', (level, packageName, ...args) => {
                assert.equal(level, 'verbose');
                assert.equal(packageName, 'test-logger-verbose');
                const argsWithoutMeta = [...args];
                const meta = argsWithoutMeta.pop();
                assert.deepEqual(argsWithoutMeta, ['test', 'several', 'messages', 'and']);
                assert.deepEqual(meta, { meta: 'test' });
                done();
            });
            testLogger.verbose('test', 'several', 'messages', 'and', { meta: 'test' });
        });

        it('on debug', function (done) {
            const testLogger = PackageLogger.create('test-logger-debug');
            testLogger.on('log', (level, packageName, ...args) => {
                assert.equal(level, 'debug');
                assert.equal(packageName, 'test-logger-debug');
                const argsWithoutMeta = [...args];
                const meta = argsWithoutMeta.pop();
                assert.deepEqual(argsWithoutMeta, ['test', 'several', 'messages', 'and']);
                assert.deepEqual(meta, { meta: 'test' });
                done();
            });
            testLogger.debug('test', 'several', 'messages', 'and', { meta: 'test' });
        });

        it('on silly', function (done) {
            const testLogger = PackageLogger.create('test-logger-silly');
            testLogger.on('log', (level, packageName, ...args) => {
                assert.equal(level, 'silly');
                assert.equal(packageName, 'test-logger-silly');
                const argsWithoutMeta = [...args];
                const meta = argsWithoutMeta.pop();
                assert.deepEqual(argsWithoutMeta, ['test', 'several', 'messages', 'and']);
                assert.deepEqual(meta, { meta: 'test' });
                done();
            });
            testLogger.silly('test', 'several', 'messages', 'and', { meta: 'test' });
        });
    });
});
