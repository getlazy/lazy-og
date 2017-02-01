
'use strict';

const TOTAL = 200;
const LIMIT = 20;
const NUMBER_OF_ENDPOINTS = 2;
const LAZY_API_VERSION = 'v20161217';

const _ = require('lodash');
const async = require('async');
const request = require('request');
const glob = require('glob');
const fs = require('fs-extra');
const os = require('os');

const testFiles = _.map(glob.sync('./tests/*'), (testFileName) => {
    return {
        hostPath: testFileName,
        content: fs.readFileSync(testFileName)
    }
});

const start = Date.now();

async.timesLimit(TOTAL, LIMIT, (n, next) => {
    const testFile = _.sample(testFiles);

    const requestParams = {
        method: 'POST',
        url: `http://lazy-${_.random(NUMBER_OF_ENDPOINTS - 1)}.getlazy.io:8000/file`,
        json: true,
        headers: {
            Accept: 'application/json',
            'X-LazyClient-Version': LAZY_API_VERSION
        },
        body: {
            hostPath: testFile.hostPath,
            language: 'unknown',
            content: testFile.content,
            context: {
                hostname: os.hostname(),
                client: 'lazy-tests/post-file-stress'
            }
        }
    };

    request(requestParams, (err, response, body) => {
        if (err) {
            console.log(err);
            next();
            return;
        }

        if (response.statusCode !== 200) {
            console.log(response.statusCode, body);
            next();
            return;
        }

        next();
    });
}, (err) => {
    console.log('Total runtime', (Date.now() - start));
});
