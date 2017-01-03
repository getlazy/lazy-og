
'use strict';

/* global logger, describe, it, before, after, afterEach */

//  To set some properties we need `this` of `describe` and `it` callback functions.
/* eslint prefer-arrow-callback: off, func-names: off, class-methods-use-this: off, lodash/prefer-constant: off */

require('./bootstrap');

const td = require('testdouble');

const assert = require('assert');
const EngineUtil = require('../lib/engine-util');

describe('EngineUtil', function () {
    afterEach(() => {
        td.reset();
    });

    describe('getEngineConfig', function () {
        it('works', function () {
            td.when(td.replace(EngineUtil, '_makeRequest')({
                method: 'GET',
                url: 'http://x/config',
                json: true,
                headers: {
                    Accept: 'application/json'
                },
                qs: {
                    engine: 'y'
                }
            })).thenResolve({
                test: 'config'
            });

            return EngineUtil.getEngineConfig('x', 'y')
                .then((config) => {
                    assert.equal(config.test, 'config');
                });
        });
    });
});
