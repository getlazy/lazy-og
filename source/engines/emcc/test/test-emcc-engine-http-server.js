
'use strict';

const _ = require('lodash');
const assert = require('assert');
const request = require('request');

const ASSERT_FALSE = (data) => {
    logger.error(data);
    assert(false);
};

const ANALYZE_FILE_FIXTURE = [{
    name: '200 - C++',
    params: {
        client: 'atom',
        stackId: '0',
        path: '/src/test.cpp',
        grammar: 'C++',
        content:
`
#include <vector>

class XYZ {
    ~XYZ() {};
};

int main() {
    int x, y, z = 0.1;
    float x, y, z = 0.1;
    return 0;
}
`
    },
    then: (results) => {
        const warnings = results.warnings;
        assert.equal(warnings.length, 4);
        const warningsPerType = _.groupBy(warnings, (warning) => warning.type);
        assert.equal(warningsPerType['Error'].length, 3);
        assert.equal(warningsPerType['Warning'].length, 1);
    },
    catch: ASSERT_FALSE
}, {
    name: '200 - C',
    params: {
        client: 'atom',
        stackId: '0',
        path: '/src/test.c',
        grammar: 'C',
        content:
`
int main() {
    int x, y, z = 0.1;
    float x, y, z = 0.1;
    return 0;
}

class X {};
`
    },
    then: (results) => {
        const warnings = results.warnings;
        assert.equal(warnings.length, 6);
        const warningsPerType = _.groupBy(warnings, (warning) => warning.type);
        assert.equal(warningsPerType['Error'].length, 5);
        assert.equal(warningsPerType['Warning'].length, 1);
    },
    catch: ASSERT_FALSE
}];

describe('EmccEngineHttpServer', function() {
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
                        clientPath: params.path,
                        content: params.content
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
