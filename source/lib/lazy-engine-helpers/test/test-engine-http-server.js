'use strict';

/* global logger, describe, it, afterEach */

//  To set some properties we need `this` of `describe` and `it` callback functions.
/* eslint prefer-arrow-callback: off, func-names: off */

require('./bootstrap');

const _ = require('lodash');
const assert = require('assert');
const td = require('testdouble');
const EngineHttpServer = require('../lib/engine-http-server');

const fakeExpress = {
    use: _.noop,
    get: _.noop,
    post: _.noop,
    listen: _.noop
};

describe('EngineHttpServer', function () {
    afterEach(() => {
        td.reset();
    });

    describe('start', function () {
        it('works', function () {
            const express = td.object(fakeExpress);
            const server = new EngineHttpServer(123);
            server._createExpressApp = td.when(td.function()()).thenReturn(express);
            server._startListening = td.when(td.function()(express)).thenResolve({});
            return server.start()
                .then(() => {
                    assert(server.isReady);
                    assert(server._httpServer);
                });
        });

        it('handles errors', function () {
            const express = td.object(fakeExpress);
            const server = new EngineHttpServer(123);
            server._createExpressApp = td.when(td.function()()).thenReturn(express);
            server._startListening = td.when(td.function()(express)).thenReject(
                new Error('test-error'));
            return server.start()
                .then(() => {
                    //  This should never happen.
                    assert(false);
                })
                .catch((err) => {
                    assert(err);
                    assert.equal(err.message, 'test-error');
                });
        });

        it('handles double errors', function () {
            const express = td.object(fakeExpress);
            const server = new EngineHttpServer(123);
            server._createExpressApp = td.when(td.function()()).thenReturn(express);
            server._startListening = td.when(td.function()(express)).thenReject(
                new Error('test-error'));
            //  This line of code cannot be verified except through logging. However, we also
            //  check coverage and there its effect can be seen.
            server.afterListening = td.when(td.function()()).thenReject(
                new Error('second-test-error'));
            return server.start()
                .then(() => {
                    //  This should never happen.
                    assert(false);
                })
                .catch((err) => {
                    assert(err);
                    assert.equal(err.message, 'test-error');
                });
        });
    });

    describe('stop', function () {
        it('works', function () {
            const express = td.object(fakeExpress);
            const server = new EngineHttpServer(123);
            server._createExpressApp = td.when(td.function()()).thenReturn(express);
            server._startListening = td.when(td.function()(express)).thenResolve({
                close: _.noop
            });
            server.afterListening = td.when(td.function()()).thenResolve('after-listening');
            return server.start()
                .then(() => {
                    assert(server.isReady);
                    assert(server._httpServer);
                    return server.stop();
                })
                .then((result) => {
                    assert(!server.isReady);
                    assert(!server._httpServer);
                    assert.equal(result, 'after-listening');
                });
        });
    });

    describe('_middleware503IfNotReady', function () {
        it('works when server not ready', function () {
            const server = new EngineHttpServer();
            const res = td.object({
                setHeader: _.noop,
                sendStatus: _.noop
            });
            td.when(res.setHeader('Retry-After', td.matchers.argThat(
                (retryValue) => {
                    assert(_.isNumber(retryValue));
                }))).thenReturn();
            td.when(res.sendStatus(503)).thenReturn();
            server._middleware503IfNotReady({}, res, () => {
                //  This should never happen.
                assert(false);
            });
        });

        it('works when server is ready', function (done) {
            const express = td.object(fakeExpress);
            const server = new EngineHttpServer(123);
            server._createExpressApp = td.when(td.function()()).thenReturn(express);
            server._startListening = td.when(td.function()(express)).thenResolve({});
            server.start()
                .then(() => {
                    assert(server.isReady);
                    assert(server._httpServer);
                    server._middleware503IfNotReady({}, {}, () => {
                        done();
                    });
                });
        });
    });

    describe('_startListening', function () {
        it('works', function () {
            const express = td.object(fakeExpress);
            const server = new EngineHttpServer(123);
            td.when(express.listen(123, td.callback(null))).thenReturn('http-server');
            return server._startListening(express)
                .then((httpServer) => {
                    assert.equal(httpServer, 'http-server');
                });
        });

        it('handles errors', function () {
            const express = td.object(fakeExpress);
            const server = new EngineHttpServer(123);
            td.when(express.listen(123)).thenCallback(new Error('test-error'));
            return server._startListening(express)
                .catch((err) => {
                    assert(err);
                    assert.equal(err.message, 'test-error');
                });
        });
    });

    describe('_endpointPostFile', function () {
        it('invokes analyzeFile', function () {
            let analyzeFileInvoked = false;
            let server;
            class TestEngineHttpServer extends EngineHttpServer {
                analyzeFile(hostPath, language, content, context) {
                    assert.equal(this, server);
                    assert.equal(hostPath, 'test-host-path');
                    assert.equal(language, 'test-language');
                    assert.equal(content, 'test-content');
                    assert.equal(context.test, 'test-context');
                    analyzeFileInvoked = true;
                    return Promise.resolve([]);
                }
            }

            const req = {
                body: {
                    hostPath: 'test-host-path',
                    language: 'test-language',
                    content: 'test-content',
                    context: {
                        test: 'test-context'
                    }
                }
            };
            let sendInvoked = false;
            const res = {
                send: () => {
                    sendInvoked = true;
                }
            };

            server = new TestEngineHttpServer(123);
            return server._endpointPostFile(req, res)
                .then(() => {
                    assert(analyzeFileInvoked);
                    assert(sendInvoked);
                });
        });

        it('handles errors', function () {
            let server;
            class TestEngineHttpServer extends EngineHttpServer {
                analyzeFile(hostPath, language, content, context) {
                    assert.equal(this, server);
                    assert.equal(hostPath, 'test-host-path');
                    assert.equal(language, 'test-language');
                    assert.equal(content, 'test-content');
                    assert.equal(context.test, 'test-context');
                    return Promise.reject(new Error('test-error'));
                }
            }

            const req = {
                body: {
                    hostPath: 'test-host-path',
                    language: 'test-language',
                    content: 'test-content',
                    context: {
                        test: 'test-context'
                    }
                }
            };
            let statusInvoked = false;
            let sendInvoked = false;
            const res = {
                status: (statusCode) => {
                    assert.equal(statusCode, 500);
                    statusInvoked = true;
                    return res;
                },
                send: (err) => {
                    assert.equal(err.error, 'test-error');
                    sendInvoked = true;
                }
            };

            server = new TestEngineHttpServer(123);
            return server._endpointPostFile(req, res)
                .then(() => {
                    assert(statusInvoked);
                    assert(sendInvoked);
                });
        });
    });
});
