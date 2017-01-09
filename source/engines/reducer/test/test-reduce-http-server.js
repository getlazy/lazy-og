'use strict';

const _ = require('lodash');
const assert = require('assert');
const request = require('request');

const ASSERT_FALSE = (data) => {
    logger.error(data);
    assert(false);
};

const ANALYZE_FILE_FIXTURE = [{
    name: '200 - max 2 warnings',
    params: {
        path: '/src/test.js',
        language: 'JavaScript',
        content: '',
        context: require('./testdata.json')
    },
    then: (results) => {
        const warnings = results.warnings;
        assert.equal(warnings.length, 3);
    },
    catch: ASSERT_FALSE
}, {
    name: '200 - max 2 warnings per rule',
    params: {
        path: '/src/test.js',
        language: 'JavaScript',
        content: '',
        context: require('./testdata1.json')
    },
    then: (results) => {
        const warnings = results.warnings;

        assert.equal(warnings.length, 19);
        const warningsPerType = _.groupBy(warnings, (warning) => warning.type);
        assert.equal(warningsPerType['Error'].length, 9);
        assert.equal(warningsPerType['Info'].length, 9);
        assert.equal(warningsPerType['Warning'].length, 1);
    },
    catch: ASSERT_FALSE
}, {
    name: '200 - handle case w/ no previous messages',
    params: {
        path: '/src/test.js',
        language: 'JavaScript',
        content: '',
        context: ''
    },
    then: (results) => {
        const warnings = results.warnings;
        assert.equal(warnings.length, 0);
    },
    catch: ASSERT_FALSE
}, {
    name: '200 - handle case w/ no previous messages',
    params: {
        path: '/src/test.js',
        language: 'JavaScript',
        content: '',
        context: `{
  "host": "MacNebojsa.local",
  "client": "atom@1.12.7",
  "repositoryInformation": null,
  "previousStepResults": { "warnings": []}
}`
    },
    then: (results) => {
        const warnings = results.warnings;
        assert.equal(warnings.length, 0);
    },
    catch: ASSERT_FALSE
}, {
    name: '200 - handle case w/ no previous messages',
    params: {
        path: '/src/test.js',
        language: 'JavaScript',
        content: '',
        context: `{
  "host": "MacNebojsa.local",
  "client": "atom@1.12.7",
  "repositoryInformation": null
}`
    },
    then: (results) => {
        const warnings = results.warnings;
        assert.equal(warnings.length, 0);
    },
    catch: ASSERT_FALSE
}];

describe('PostProcEngineHttpServer', function () {
    this.timeout(20000);

    before(function () {
        return require('./bootstrap').start();
    });

    after(function () {
        return require('./bootstrap').stop();
    });

    describe('POST /file', function () {
        let onlyFixtures = _.filter(ANALYZE_FILE_FIXTURE, (fixture) => fixture.only);
        if (_.isEmpty(onlyFixtures)) {
            onlyFixtures = ANALYZE_FILE_FIXTURE;
        }
        _.each(onlyFixtures, (fixture) => {
            let params = fixture.params;
            it(fixture.name, function () {
                const requestParams = {
                    method: 'POST',
                    url: 'http://localhost/file',
                    json: true,
                    headers: {
                        'Accept': 'application/json'
                    },
                    body: {
                        hostPath: params.path,
                        content: params.content,
                        language: params.language,
                        context: params.context
                    }
                };

                return new Promise((resolve, reject) => {
                        request(requestParams, (err, response, body) => {
                            if (err) {
                                return reject(err);
                            }

                            if (response.statusCode !== 200) {
                                let message = 'HTTP engine failed with ' + response.statusCode +
                                    ' status code';
                                if (body && body.error) {
                                    message += ' (' + body.error + ')';
                                }

                                return reject(new Error(message));
                            }

                            resolve(body);
                        });
                    })
                    .then(fixture.then)
                    .catch(fixture.catch);
            });
        });
    });
});
