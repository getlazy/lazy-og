
'use strict';

const _ = require('lodash');
const assert = require('assert');
const request = require('request');

const ASSERT_FALSE = (data) => {
    logger.error(data);
    assert(false);
};

const ANALYZE_FILE_FIXTURE = [{
    name: '200 - css',
    params: {
        path: '/src/test.css',
        //  We use SCSS as a) it's a superset of CSS and b) Stylelint doesn't accept CSS but SCSS
        language: 'scss',
        content:
`
.some-title { font-weight: bold; }
.some-other-title { font-weight: bold; color: red }

p.normal {
    border: 2px solid red;
}

p.round1 {
    border: 2px solid red;
    border-radius: 5px;
}

p.round2 {
    border: 2px solid red;
    border-radius: 8px;
}

p.round3 {
    border: 2px solid red;
    border-radius: 12px;
}

a { color: pink; color: orange; }
`
    },
    then: (results) => {
        const warnings = results.warnings;
        assert.equal(warnings.length, 10);
        const warningsPerType = _.groupBy(warnings, (warning) => warning.type);
        assert.equal(warningsPerType['error'].length, 10);
    },
    catch: ASSERT_FALSE
}, {
    name: '200 - scss',
    params: {
        path: '/src/test.scss',
        language: 'scss',
        content:
`
.some-title { font-weight: bold; }
.some-other-title { font-weight: bold; color: red }

p.normal {
    border: 2px solid red;
}

p.round1 {
    border: 2px solid red;
    border-radius: 5px;
}

p.round2 {
    border: 2px solid red;
    border-radius: 8px;
}

p.round3 {
    border: 2px solid red;
    border-radius: 12px;
}

a { color: pink; color: orange; }
`
    },
    then: (results) => {
        const warnings = results.warnings;
        assert.equal(warnings.length, 10);
        const warningsPerType = _.groupBy(warnings, (warning) => warning.type);
        assert.equal(warningsPerType['error'].length, 10);
    },
    catch: ASSERT_FALSE
}, {
    name: '200 - LESS',
    params: {
        path: '/src/test.less',
        language: 'less',
        content:
`
@base: #f938ab;

.box-shadow(@style, @c) when (iscolor(@c)) {
  -webkit-box-shadow: @style @c;
  box-shadow:         @style @c;
}
.box-shadow(@style, @alpha: 50%) when (isnumber(@alpha)) {
  .box-shadow(@style, rgba(0, 0, 0, @alpha));
}
.box {
  color: saturate(@base, 5%);
  border-color: lighten(@base, 30%);
  div { .box-shadow(0 0 5px, 30%) }
}
`
    },
    then: (results) => {
        const warnings = results.warnings;
        assert.equal(warnings.length, 2);
        const warningsPerType = _.groupBy(warnings, (warning) => warning.type);
        assert.equal(warningsPerType['error'].length, 2);
    },
    catch: ASSERT_FALSE
}];

describe('StylelintEngineHttpServer', function() {
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
