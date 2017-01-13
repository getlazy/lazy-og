
'use strict';

/* global logger, describe, it, before, after, afterEach */

//  To set some properties we need `this` of `describe` and `it` callback functions.
// lazy ignore prefer-arrow-callback
// lazy ignore func-names
// lazy ignore class-methods-use-this
// lazy ignore lodash/preferred-alias

require('./bootstrap');

const _ = require('lodash');
const assert = require('assert');
const LazyYamlFile = require('../app/lazy-yaml-file');
const configTests = require('./fixtures/lazy-yaml-file-config-tests');

describe('LazyYamlFile', function () {
    describe('_getConfigErrors', function () {
        _.each(configTests, (test) => {
            it(`schema check test ${test.id}`, function () {
                const errors = LazyYamlFile._getConfigErrors(test.config);
                if (test.firstErrorMessage) {
                    assert(errors);
                    assert.equal(_.first(errors).message, test.firstErrorMessage);
                } else {
                    assert(!errors);
                }
            });
        });
    });
});
