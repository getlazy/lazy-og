
'use strict';

/* global logger, describe, it, before, after, afterEach */

//  To set some properties we need `this` of `describe` and `it` callback functions.
/* eslint prefer-arrow-callback: off, func-names: off, class-methods-use-this: off, lodash/prefer-constant: off */

require('./bootstrap');

const td = require('testdouble');

const _ = require('lodash');
const assert = require('assert');
const HelperContainerManager = require('../app/helper-container-manager');

describe('HelperContainerManager', function () {
    afterEach(() => {
        td.reset();
    });

    describe('createContainer', function () {
        it('works', function () {
            td.when(td.replace(HelperContainerManager, '_pullImage')({}, 'test-image')).thenResolve();
            const containerId = 'test-container-id';
            const container = td.object(['start']);
            container.id = containerId;
            td.when(container.start()).thenResolve({ id: 'test-container-id' });
            td.when(td.replace(HelperContainerManager, '_createContainer')(td.matchers.argThat((params) => {
                assert.equal(params.Image, 'test-image');
                assert.equal(_.get(params, 'HostConfig.NetworkMode'), 'test-network');
                assert.deepEqual(_.get(params, 'HostConfig.Binds'), ['test-volume:/lazy']);
                assert.deepEqual(_.get(params, 'Labels'), {
                    'io.lazyass.lazy.helper-container-manager.owned': 'true'
                });
                return true;
            }))).thenResolve(container);

            return HelperContainerManager.createContainer({}, 'test-image', 'test-volume', 'test-network')
                .then((createdContainerId) => {
                    assert.equal(createdContainerId, containerId);
                });
        });

        it('returns 500 on any error', function (done) {
            td.when(td.replace(HelperContainerManager, '_pullImage')({}, 'test-image')).thenResolve();
            const containerId = 'test-container-id';
            const container = td.object(['start']);
            container.id = containerId;
            td.when(container.start()).thenReject(new Error('test-error'));
            td.when(td.replace(HelperContainerManager, '_createContainer')(td.matchers.argThat((params) => {
                assert.equal(params.Image, 'test-image');
                assert.equal(_.get(params, 'HostConfig.NetworkMode'), 'test-network');
                assert.deepEqual(_.get(params, 'HostConfig.Binds'), ['test-volume:/lazy']);
                assert.deepEqual(_.get(params, 'Labels'), {
                    'io.lazyass.lazy.helper-container-manager.owned': 'true'
                });
                return true;
            }))).thenResolve(container);

            HelperContainerManager.createContainer({}, 'test-image', 'test-volume', 'test-network')
                .catch((err) => {
                    assert.equal(err.statusCode, 500);
                    assert.equal(err.message, 'create failed with test-error');
                    //  Use done to ensure that catch was invoked.
                    done();
                });
        });
    });

    describe('deleteContainer', function () {
        it('works', function () {
            const containerId = 'test-container-id';
            const container = td.object(['status', 'stop', 'wait', 'delete']);
            td.when(container.status()).thenResolve({
                Config: {
                    Labels: {
                        'io.lazyass.lazy.helper-container-manager.owned': 'true'
                    }
                }
            });
            td.when(container.stop()).thenResolve();
            td.when(container.wait()).thenResolve();
            td.when(container.delete()).thenResolve();
            container.id = containerId;

            td.when(td.replace(HelperContainerManager, '_getContainerForNameOrId')(containerId))
                .thenResolve(container);

            return HelperContainerManager.deleteContainer(containerId)
                .then((deletedContainerId) => {
                    assert.equal(deletedContainerId, containerId);
                });
        });

        it('returns 500 on any error', function (done) {
            const containerId = 'test-container-id';
            const container = td.object(['status', 'stop', 'wait', 'delete']);
            td.when(container.status()).thenResolve({
                Config: {
                    Labels: {
                        'io.lazyass.lazy.helper-container-manager.owned': 'true'
                    }
                }
            });
            td.when(container.stop()).thenResolve();
            td.when(container.wait()).thenResolve();
            td.when(container.delete()).thenReject(new Error('test-error'));
            container.id = containerId;

            td.when(td.replace(HelperContainerManager, '_getContainerForNameOrId')(containerId))
                .thenResolve(container);

            HelperContainerManager.deleteContainer(containerId)
                .catch((err) => {
                    assert.equal(err.statusCode, 500);
                    assert.equal(err.message, 'delete failed with test-error');
                    //  Use done to ensure that catch was invoked.
                    done();
                });
        });
    });

    describe('execInContainer', function () {
        it('works', function () {
            const containerId = 'test-container-id';
            const container = td.object(['status']);
            td.when(container.status()).thenResolve({
                Config: {
                    Labels: {
                        'io.lazyass.lazy.helper-container-manager.owned': 'true'
                    }
                }
            });
            container.id = containerId;

            td.when(td.replace(HelperContainerManager, '_getContainerForNameOrId')(containerId))
                .thenResolve(container);

            const execParams = {
                test: 'params'
            };

            td.when(td.replace(HelperContainerManager, '_execInContainer')(container, execParams))
                .thenResolve(['test', 'output']);

            return HelperContainerManager.execInContainer(containerId, execParams)
                .then((output) => {
                    assert.equal(output[0], 'test');
                    assert.equal(output[1], 'output');
                });
        });

        it('returns 500 on any error', function (done) {
            const containerId = 'test-container-id';
            const container = td.object(['status']);
            td.when(container.status()).thenResolve({
                Config: {
                    Labels: {
                        'io.lazyass.lazy.helper-container-manager.owned': 'true'
                    }
                }
            });
            container.id = containerId;

            td.when(td.replace(HelperContainerManager, '_getContainerForNameOrId')(containerId))
                .thenResolve(container);

            const execParams = {
                test: 'params'
            };

            td.when(td.replace(HelperContainerManager, '_execInContainer')(container, execParams))
                .thenReject(new Error('test-error'));

            HelperContainerManager.execInContainer(containerId, execParams)
                .catch((err) => {
                    assert.equal(err.statusCode, 500);
                    assert.equal(err.message, 'exec failed with test-error');
                    //  Use done to ensure that catch was invoked.
                    done();
                });
        });
    });

    describe('_findContainer', function () {
        it('returns 404 on unknown container ID', function (done) {
            const containerId = 'unknown-container-id';
            td.when(td.replace(HelperContainerManager, '_getContainerForNameOrId')(containerId))
                .thenResolve(null);

            HelperContainerManager._findContainer(containerId)
                .catch((err) => {
                    assert.equal(err.statusCode, 404);
                    //  Use done to ensure that catch was invoked.
                    done();
                });
        });

        it('returns 403 on unowned container ID', function (done) {
            const containerId = 'test-container-id';
            const container = td.object(['status']);
            td.when(container.status()).thenResolve({
                Config: {
                    Labels: {
                        'io.lazyass.lazy.helper-container-manager.owned': 'corrupted'
                    }
                }
            });
            td.when(td.replace(HelperContainerManager, '_getContainerForNameOrId')(containerId))
                .thenResolve(container);

            HelperContainerManager._findContainer(containerId)
                .catch((err) => {
                    assert.equal(err.statusCode, 403);
                    //  Use done to ensure that catch was invoked.
                    done();
                });
        });
    });
});
