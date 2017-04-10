
'use strict';

// During testing we only want the temporary console logger as we don't want any messages
// to end up in other log sinks like ElasticSearch.
global.logger = require('../app/logger').createTemporaryLogger();
