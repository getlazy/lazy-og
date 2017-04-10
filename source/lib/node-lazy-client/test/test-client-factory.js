
'use strict';

const _ = require('lodash');
const assert = require('assert');
const ClientFactory = require('../lib/client-factory');

describe('ClientFactory', function() {
    it('returns null on unknown client version', function() {
        const LazyClient = ClientFactory.getClientClass(12345);
        assert(_.isNull(LazyClient));
    });

    it('loads v20161217', function() {
        const LazyClient = ClientFactory.getClientClass('v20161217');
        assert(LazyClient);
        assert.equal(LazyClient.version, 'v20161217');
    });
});
