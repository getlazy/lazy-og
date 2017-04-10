
'use strict';

// oh-lodash will load lodash mixins.
require('oh-lodash');

module.exports = require('./lib/engine-pipeline');
module.exports.logger = require('@lazyass/common').createPackageLogger('lazy-engine-pipeline');
