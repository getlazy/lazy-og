'use strict';

/* global logger, describe, it */

//  To set some properties we need `this` of `describe` and `it` callback functions.
/* eslint prefer-arrow-callback: off, func-names: off */

require('./bootstrap');

const _ = require('lodash');
const assert = require('assert');
const AdaptedAtomLinter = require('../lib/adapted-atom-linter');

describe('AdaptedAtomLinter', function () {
    describe('parse', function () {
        it('works', function () {
            const EMCC_OUTPUT_REGEX = '(?<file>.+):' +
                '(?<line>\\d+):(?<col>\\d+):' +
                '(\\{(?<lineStart>\\d+):(?<colStart>\\d+)\\-(?<lineEnd>\\d+):(?<colEnd>\\d+)}.*:)? ' +
                '(?<type>[\\w \\-]+): ' +
                '(?<message>.*)';
            const results = AdaptedAtomLinter.parse(`
file1:100:200: warning: test message
file2:40:80: awful-mega warning: another test message
`, EMCC_OUTPUT_REGEX);
            assert(results);
            assert(_.isArray(results));
            assert.equal(results.length, 2);
            assert.equal(results[0].message, 'test message');
            assert.equal(results[1].message, 'another test message');
        });
    });
});
