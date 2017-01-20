'use strict';

const _ = require('lodash');
const assert = require('assert');

module.exports = {
    beforeListeningTestCases: [{
        id: 'Test #1',
        then: (results, engine) => {
            assert.deepEqual(engine.config, {test: 'value'});
            assert(_.isUndefined(results));
        }
    }, {
        id: 'Test #2',
        then: (results, engine) => {
            assert.deepEqual(engine.config, {test: 'value'});
            assert(_.isUndefined(results));
        },
    }],
    afterListeningTestCases: [{
        id: 'Test #1',
        then: (results) => {
            assert(_.isUndefined(results));
        }
    }, {
        id: 'Test #2',
        then: (results) => {
            assert(_.isUndefined(results));
        },
    }]

};