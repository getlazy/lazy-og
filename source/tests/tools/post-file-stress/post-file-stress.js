
'use strict';

const TOTAL = 200000;
const LIMIT = 40;
const LAZY_API_VERSION = 'v20161217';

const _ = require('lodash');
const async = require('async');
const request = require('request');
const glob = require('glob');
const fs = require('fs-extra');
const os = require('os');

// lazy ignore no-console

const testFiles = _.map(glob.sync('./tests/*'), (testFileName) => {
    return {
        hostPath: testFileName,
        content: fs.readFileSync(testFileName)
    };
});

const start = Date.now();
let totalTime = 0;
let counter = 0;

async.timesLimit(TOTAL, LIMIT, (n, next) => {
    const testFile = testFiles[n % testFiles.length];

    const requestParams = {
        method: 'POST',
        url: 'http://35.185.27.20/file',
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

    const startN = Date.now();
    request(requestParams, (err, response, body) => {
        const endN = Date.now();

        totalTime += endN - startN;

        ++counter;
        if (counter % 25 === 0) {
            console.log('Response #', counter);
            console.log('Total runtime', (Date.now() - start));
            console.log('Avg reply', totalTime / n);
        }

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
    console.log(err);
    console.log('Total runtime', (Date.now() - start));
    console.log('Avg reply', totalTime / TOTAL);
});
