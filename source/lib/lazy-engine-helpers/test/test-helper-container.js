
'use strict';

/* global logger, describe, it, before, after, afterEach */

//  To set some properties we need `this` of `describe` and `it` callback functions.
/* eslint prefer-arrow-callback: off, func-names: off, class-methods-use-this: off, lodash/prefer-constant: off */

require('./bootstrap');

const td = require('testdouble');

const _ = require('lodash');
const assert = require('assert');
const HelperContainer = require('../lib/helper-container');

describe('HelperContainer', function () {
    afterEach(() => {
        td.reset();
    });

    describe('Object methods', function () {
        describe('analyzeFile', function () {
            it('ensures Cmd params are an array', function () {
                const helperContainer = new HelperContainer('test-helper-id', 'test-engine-id');
                let _execInContainerInvoked = false;
                td.when(td.replace(HelperContainer, '_mkdirp')()).thenResolve();
                td.when(td.replace(HelperContainer, '_createTempFileWithContent')(
                    'content', 'hostPath')).thenResolve({
                        path: 'temp-test-path'
                    });
                td.when(td.replace(HelperContainer, '_execInContainer')('test-helper-id', td.matchers.argThat((execParams) => {
                    assert(execParams);
                    assert(_.isArray(execParams.Cmd));
                    _execInContainerInvoked = true;
                    return true;
                }))).thenResolve([]);

                return helperContainer.analyzeFile('hostPath', 'language', 'content')
                    .then((results) => {
                        assert(results);
                        assert(_.isEmpty(results));
                        assert(_execInContainerInvoked);
                    });
            });

            it('uses _getBaseContainerExecParams if available', function () {
                class TestHelperContainer extends HelperContainer {
                    _getBaseContainerExecParams() {
                        return {
                            Entrypoint: 'test-entrypoint',
                            Cmd: ['this', 'now']
                        };
                    }
                }

                const helperContainer = new TestHelperContainer('test-helper-id', 'test-engine-id');
                let _execInContainerInvoked = false;
                td.when(td.replace(HelperContainer, '_mkdirp')()).thenResolve();
                td.when(td.replace(HelperContainer, '_createTempFileWithContent')(
                    'content', 'hostPath')).thenResolve({
                        path: 'temp-test-path'
                    });
                td.when(td.replace(HelperContainer, '_execInContainer')('test-helper-id', td.matchers.argThat((execParams) => {
                    assert(execParams);
                    assert.equal(execParams.Entrypoint, 'test-entrypoint');
                    assert(_.isArray(execParams.Cmd));
                    assert.equal(execParams.Cmd.length, 3);
                    assert.equal(execParams.Cmd[0], 'this');
                    assert.equal(execParams.Cmd[1], 'now');
                    assert(_.endsWith(execParams.Cmd[2], 'temp-test-path'));
                    _execInContainerInvoked = true;
                    return true;
                }))).thenResolve([]);

                return helperContainer.analyzeFile('hostPath', 'language', 'content')
                    .then((results) => {
                        assert(results);
                        assert(_.isEmpty(results));
                        assert(_execInContainerInvoked);
                    });
            });

            it('uses _getContainerEntrypoint if available', function () {
                class TestHelperContainer extends HelperContainer {
                    _getContainerEntrypoint() {
                        return 'test-entrypoint';
                    }
                }

                const helperContainer = new TestHelperContainer('test-helper-id', 'test-engine-id');
                let _execInContainerInvoked = false;
                td.when(td.replace(HelperContainer, '_mkdirp')()).thenResolve();
                td.when(td.replace(HelperContainer, '_createTempFileWithContent')(
                    'content', 'hostPath')).thenResolve({
                        path: 'temp-test-path'
                    });
                td.when(td.replace(HelperContainer, '_execInContainer')('test-helper-id', td.matchers.argThat((execParams) => {
                    assert(execParams);
                    assert.equal(execParams.Entrypoint, 'test-entrypoint');
                    assert(_.isArray(execParams.Cmd));
                    assert.equal(execParams.Cmd.length, 1);
                    assert(_.endsWith(execParams.Cmd[0], 'temp-test-path'));
                    _execInContainerInvoked = true;
                    return true;
                }))).thenResolve([]);

                return helperContainer.analyzeFile('hostPath', 'language', 'content')
                    .then((results) => {
                        assert(results);
                        assert(_.isEmpty(results));
                        assert(_execInContainerInvoked);
                    });
            });

            it('uses _getContainerCmd if available', function () {
                class TestHelperContainer extends HelperContainer {
                    _getContainerCmd() {
                        return ['test-arg0', 'test-arg1'];
                    }
                }

                const helperContainer = new TestHelperContainer('test-helper-id', 'test-engine-id');
                let _execInContainerInvoked = false;
                td.when(td.replace(HelperContainer, '_mkdirp')()).thenResolve();
                td.when(td.replace(HelperContainer, '_createTempFileWithContent')(
                    'content', 'hostPath')).thenResolve({
                        path: 'temp-test-path'
                    });
                td.when(td.replace(HelperContainer, '_execInContainer')('test-helper-id', td.matchers.argThat((execParams) => {
                    assert(execParams);
                    assert(_.isUndefined(execParams.Entrypoint));
                    assert(_.isArray(execParams.Cmd));
                    assert.equal(execParams.Cmd.length, 3);
                    assert.equal(execParams.Cmd[0], 'test-arg0');
                    assert.equal(execParams.Cmd[1], 'test-arg1');
                    assert(_.endsWith(execParams.Cmd[2], 'temp-test-path'));
                    _execInContainerInvoked = true;
                    return true;
                }))).thenResolve([]);

                return helperContainer.analyzeFile('hostPath', 'language', 'content')
                    .then((results) => {
                        assert(results);
                        assert(_.isEmpty(results));
                        assert(_execInContainerInvoked);
                    });
            });

            it('uses _processContainerOutput if available', function () {
                class TestHelperContainer extends HelperContainer {
                    _processContainerOutput() {
                        return {
                            warnings: [{
                                id: 'output0'
                            }, {
                                id: 'output1'
                            }]
                        };
                    }
                }

                const helperContainer = new TestHelperContainer('test-helper-id', 'test-engine-id');
                td.when(td.replace(HelperContainer, '_mkdirp')()).thenResolve();
                td.when(td.replace(HelperContainer, '_createTempFileWithContent')(
                    'content', 'hostPath')).thenResolve({
                        path: 'test-path'
                    });
                td.when(td.replace(HelperContainer, '_execInContainer')(
                    'test-engine-id', 'test-helper-id', td.matchers.anything())).thenResolve([]);

                return helperContainer.analyzeFile('hostPath', 'language', 'content')
                    .then((results) => {
                        assert(results);
                        assert(_.isArray(results.warnings));
                        assert.equal(results.warnings.length, 2);
                        assert.equal(results.warnings[0].id, 'output0');
                        assert.equal(results.warnings[1].id, 'output1');
                    });
            });
        });

        it('handles failures', function () {
            const helperContainer = new HelperContainer('test-helper-id', 'test-engine-id');
            td.when(td.replace(HelperContainer, '_mkdirp')()).thenResolve();
            td.when(td.replace(HelperContainer, '_createTempFileWithContent')(
                'content', 'hostPath')).thenResolve({
                    path: 'temp-test-path'
                });
            td.when(td.replace(HelperContainer, '_execInContainer')(
                'test-engine-id', 'test-helper-id', td.matchers.anything())).thenReject(new Error('test-error'));

            return helperContainer.analyzeFile('hostPath', 'language', 'content')
                .catch((err) => {
                    assert(err);
                    assert.equal(err.message, 'test-error');
                });
        });
    });
});
