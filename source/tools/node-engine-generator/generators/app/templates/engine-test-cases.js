'use strict';

const _ = require('lodash');
const assert = require('assert');

module.exports = [{
    id: 'Test #1',
    params: {
        path: '/src/test.js',
        language: 'JavaScript',
        content: '',
        context: {
            engineParams: 'engine params',
            previousStepResults: {
                warnings: []
            }
        }
    },
    then: (results) => {
        assert.deepEqual(results, {}, 'Results not empty');
    }
}, {
    id: 'Test #2',
    params: {
        path: '/src/test.js',
        language: 'JavaScript',
        content: '',
        context: {
            engineParams: 'engine params',
            previousStepResults: {
                warnings: []
            }
        }
    },
    then: (results) => {
        assert.deepEqual(results, {}, 'Results not empty');
    },
}];
