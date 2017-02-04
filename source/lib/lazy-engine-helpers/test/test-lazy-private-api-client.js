
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
            const client = new LazyPrivateApiClient('x', 'y');
            td.when(td.replace(client, '_makeRequest')('GET', 'config', { engine: 'y' }))
                .thenResolve({
                    test: 'config'
                });

            return client.getEngineConfig()
                .then((config) => {
                    assert.equal(config.test, 'config');
                });
        });
    });

    describe('execInHelperContainer', function () {
        it('works', function () {
            const client = new LazyPrivateApiClient('x', 'y');
            td.when(td.replace(client, '_makeRequest')(
                'POST', 'helper-container/exec', undefined, {
                    helperId: 'test-helper-id',
                    execParams: {
                        test: 'exec'
                    }
                })
            )
                .thenResolve(['test', 'output']);

            return client.execInHelperContainer('test-helper-id', { test: 'exec' })
                .then((output) => {
                    assert.equal(output[0], 'test');
                    assert.equal(output[1], 'output');
                });
        });
    });

    describe('_makeRequest', function () {
        it('correctly uses lazy URL', function () {
            const client = new LazyPrivateApiClient('http://x.y', 'z');
            td.when(td.replace(LazyPrivateApiClient, '_issueRequest')({
                method: 'POST',
                url: 'http://x.y/helper-container/exec',
                json: true,
                headers: {
                    Accept: 'application/json'
                },
                body: {
                    helperId: 'test-helper-id',
                    execParams: {
                        test: 'exec'
                    }
                },
                qs: undefined
            }))
                .thenResolve(['test', 'output']);

            return client.execInHelperContainer('test-helper-id', { test: 'exec' })
                .then((output) => {
                    assert.equal(output[0], 'test');
                    assert.equal(output[1], 'output');
                });
        });
    });
});
