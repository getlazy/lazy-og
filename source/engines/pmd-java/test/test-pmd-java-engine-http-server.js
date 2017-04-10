
'use strict';

const _ = require('lodash');
const assert = require('assert');
const request = require('request');

const ASSERT_FALSE = (data) => {
    logger.error(data);
    assert(false);
};

const ANALYZE_FILE_FIXTURE = [{
    name: '200 - Java',
    params: {
        path: '/src/test.java',
        language: 'Java',
        content:
`
import hoho.bubu;
import hoho.bubu2;
`
    },
    then: (results) => {
        const warnings = results.warnings;
        assert.equal(warnings.length, 2);
        const warningsPerType = _.groupBy(warnings, (warning) => warning.type);
        assert.equal(warningsPerType['Warning'].length, 2);
        assert.equal(warnings[0].message, 'Avoid unused imports such as \'hoho.bubu\'');
        assert.equal(warnings[1].message, 'Avoid unused imports such as \'hoho.bubu2\'');
    },
    catch: ASSERT_FALSE
}];

describe('PmdJavaEngineHttpServer', function() {
    this.timeout(20000);

    before(function() {
        return require('./bootstrap').start();
    });

    after(function() {
        return require('./bootstrap').stop();
    });

    describe('POST /file', function() {
        let onlyFixtures = _.filter(ANALYZE_FILE_FIXTURE, (fixture) => fixture.only);
        if (_.isEmpty(onlyFixtures)) {
            onlyFixtures = ANALYZE_FILE_FIXTURE;
        }
        _.each(onlyFixtures, (fixture) => {
            let params = fixture.params;
            it(fixture.name, function() {
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
                        language: params.language
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
