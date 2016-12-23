
'use strict';

/* global logger, describe, it */

//  To set some properties we need `this` of `describe` and `it` callback functions.
/* eslint prefer-arrow-callback: off, func-names: off */

require('./bootstrap');

const _ = require('lodash');
const assert = require('assert');
const HelperContainer = require('../lib/helper-container');
const Docker = require('node-docker-api').Docker;

const docker = new Docker({
    socketPath: '/var/run/docker.sock'
});

const TEST_IMAGE = 'hello-world';

describe('HelperContainer', function _HelperContainerTest() {
    describe('createContainer', function _createContainerTest() {
        this.timeout(15000);

        it('fails for images that are unavailable', function () {
            return HelperContainer
                .createContainer({}, 'inexisting-account/inexisting-image:inexisting.tag')
                .then(() => {
                    //  This should never happen.
                    assert(false);
                })
                .catch((err) => {
                    assert(err);
                    assert.equal(err.statusCode, 404);
                    assert(_.startsWith(err.message, '(HTTP code 404) unexpected'));
                });
        });

        it.only('pulls image that is not available', function () {
            //  First make sure the test image doesn't exist.
            return docker.image.status(TEST_IMAGE)
                .then((image) => {
                    if (image) {
                        return image.remove();
                    }

                    return Promise.resolve();
                })
                .catch((err) => {
                    assert(err);
                    assert.equal(err.statusCode, 404);
                    assert(_.startsWith(err.message, '(HTTP code 404) no such image'));
                })
                .then(() => {
                    return HelperContainer
                        .createContainer({}, TEST_IMAGE);
                });
        });
    });
});
