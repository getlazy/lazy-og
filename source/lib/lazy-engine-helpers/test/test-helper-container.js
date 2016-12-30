
'use strict';

/* global logger, describe, it, after */

//  To set some properties we need `this` of `describe` and `it` callback functions.
/* eslint prefer-arrow-callback: off, func-names: off */

require('./bootstrap');

const _ = require('lodash');
const assert = require('assert');
const HelperContainer = require('../lib/helper-container');
const Docker = require('node-docker-api').Docker;
const HigherDockerManager = require('@lazyass/higher-docker-manager');

const docker = new Docker({
    socketPath: '/var/run/docker.sock'
});

//  Use old node-dev image for testing.
const TEST_IMAGE = 'ierceg/node-dev:1.0.0';

describe('HelperContainer', function () {
    after(function () {
        //  Delete all containers in the test container network.
        this.timeout(60000);
        return HigherDockerManager.getOwnContainer()
            .then((testContainer) => {
                const networks = _.get(testContainer, 'NetworkSettings.Networks');
                return HigherDockerManager.getContainersInNetworks(networks)
                    .then(containers => Promise.all(_.map(containers, (container) => {
                        if (_.isObject(container) && container.Id !== testContainer.Id) {
                            return HelperContainer.deleteContainer(container);
                        }

                        return Promise.resolve();
                    })));
            });
    });

    describe('createContainer', function () {
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

        it('pulls image that is not available', function () {
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
                .then(() => HelperContainer.createContainer({}, TEST_IMAGE));
        });
    });
});
