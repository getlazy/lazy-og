
'use strict';

/* global logger, describe, it, before, after, afterEach */

//  To set some properties we need `this` of `describe` and `it` callback functions.
/* eslint prefer-arrow-callback: off, func-names: off, class-methods-use-this: off, lodash/prefer-constant: off */

require('./bootstrap');

const td = require('testdouble');

const assert = require('assert');
const LazyPrivateApiClient = require('../lib/lazy-private-api-client');

describe('LazyPrivateApiClient', function () {
    afterEach(() => {
        td.reset();
    });

    describe('getEngineConfig', function () {
        it('works', function () {
            const client = new LazyPrivateApiClient('test-engine-id', 'test-lazy-url');
            td.when(td.replace(client, '_makeRequest')('GET', 'config', { engineId: 'test-engine-id' }))
                .thenResolve({
                    test: 'config'
                });

            return client.getEngineConfig()
                .then((config) => {
                    assert.equal(config.test, 'config');
                });
        });
    });

    describe('execInEngineHelperContainer', function () {
        it('works', function () {
            const client = new LazyPrivateApiClient('test-engine-id', 'http://getlazy.org');
            td.when(td.replace(client, '_makeRequest')(
                'POST', 'exec-in-engine-helper-container', undefined, {
                    engineId: 'test-engine-id',
                    helperId: 'test-helper-id',
                    execParams: {
                        test: 'exec'
                    }
                })
            )
                .thenResolve(['test', 'output']);

            return client.execInEngineHelperContainer('test-helper-id', { test: 'exec' })
                .then((output) => {
                    assert.equal(output[0], 'test');
                    assert.equal(output[1], 'output');
                });
        });
    });

    describe('_makeRequest', function () {
        it('correctly uses lazy URL', function () {
            const client = new LazyPrivateApiClient('test-engine-id', 'http://getlazy.org');
            td.when(td.replace(LazyPrivateApiClient, '_issueRequest')({
                method: 'POST',
                url: 'http://getlazy.org/exec-in-engine-helper-container',
                json: true,
                headers: {
                    Accept: 'application/json'
                },
                body: {
                    engineId: 'test-engine-id',
                    helperId: 'test-helper-id',
                    execParams: {
                        test: 'exec'
                    }
                },
                qs: undefined
            }))
                .thenResolve(['test', 'output']);

            return client.execInEngineHelperContainer('test-helper-id', { test: 'exec' })
                .then((output) => {
                    assert.equal(output[0], 'test');
                    assert.equal(output[1], 'output');
                });
        });
    });
});
