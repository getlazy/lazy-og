'use strict';

const _ = require('lodash');
const assert = require('assert');
const request = require('request');

const ASSERT_FALSE = (data) => {
    logger.error(data);
    assert(false);
};

const ANALYZE_FILE_FIXTURE = [{
    name: '200 - pass context warnings without changes',
    params: {
        path: '/src/test.js',
        language: 'JavaScript',
        content: '',
        context: require('./testdata.json')
    },
    then: (results) => {
        const warnings = results.warnings;

        assert.equal(warnings.length, 20);
        const warningsPerType = _.groupBy(warnings, (warning) => warning.type);
        assert.equal(warningsPerType['Error'].length, 11);
        assert.equal(warningsPerType['Info'].length, 8);
        assert.equal(warningsPerType['Warning'].length, 1);
    },
    catch: ASSERT_FALSE
},
{
    name: '200 - remove all YamlRule1 rule ids with line comment directive',
    params: {
        path: '/src/test.js',
        language: 'JavaScript',
        content: '// lazy ignore yamlrule1',
        context: require('./testdata.json')
    },
    then: (results) => {
        const warnings = results.warnings;
        assert.equal(warnings.length, 18);
        const warningsPerType = _.groupBy(warnings, (warning) => warning.type);
        assert.equal(warningsPerType['Error'].length, 11);
        assert.equal(warningsPerType['Info'].length, 7);
        assert(_.isNil(warningsPerType['Warning']));
    },
    catch: ASSERT_FALSE
},
{
    name: '200 - remove all YamlRule1 rule ids with block comment directive',
    params: {
        path: '/src/test.js',
        language: 'JavaScript',
        content: '/* lazy ignore yamlrule1 */',
        context: require('./testdata.json')
    },
    then: (results) => {
        const warnings = results.warnings;
        assert.equal(warnings.length, 18);
        const warningsPerType = _.groupBy(warnings, (warning) => warning.type);
        assert.equal(warningsPerType['Error'].length, 11);
        assert.equal(warningsPerType['Info'].length, 7);
        assert(_.isNil(warningsPerType['Warning']));
    },
    catch: ASSERT_FALSE
},
{
    name: '200 - handle case w/ no previous messages',
    params: {
        path: '/src/test.js',
        language: 'JavaScript',
        content: '/* lazy ignore yamlrule1 */',
        context: ''
    },
    then: (results) => {
        const warnings = results.warnings;
        assert.equal(warnings.length, 1);
        const warningsPerType = _.groupBy(warnings, (warning) => warning.type);
        assert(_.isNil(warningsPerType['Error']));
        assert.equal(warningsPerType['Info'].length, 1);
        assert(_.isNil(warningsPerType['Warning']));
        assert.equal(warnings[0].ruleId,' lazy-no-linter-warnings ');
    },
    catch: ASSERT_FALSE
},
{
   name: '200 - handle case w/ no previous messages',
    params: {
        path: '/src/test.js',
        language: 'JavaScript',
        content: '/* lazy ignore yamlrule1 */',
        context: `{
  "host": "MacNebojsa.local",
  "client": "atom@1.12.7",
  "repositoryInformation": null,
  "previousStepResults": { "warnings": []}
}`
    },
    then: (results) => {
        const warnings = results.warnings;
        assert.equal(warnings.length, 1);
        const warningsPerType = _.groupBy(warnings, (warning) => warning.type);
        assert(_.isNil(warningsPerType['Error']));
        assert.equal(warningsPerType['Info'].length, 1);
        assert(_.isNil(warningsPerType['Warning']));
        assert.equal(warnings[0].ruleId,' lazy-no-linter-warnings ');
    },
    catch: ASSERT_FALSE
},
{
   name: '200 - handle case w/ no previous messages',
    params: {
        path: '/src/test.js',
        language: 'JavaScript',
        content: '/* lazy ignore yamlrule1 */',
        context: `{
  "host": "MacNebojsa.local",
  "client": "atom@1.12.7",
  "repositoryInformation": null
}`
    },
    then: (results) => {
        const warnings = results.warnings;
        assert.equal(warnings.length, 1);
        const warningsPerType = _.groupBy(warnings, (warning) => warning.type);
        assert(_.isNil(warningsPerType['Error']));
        assert.equal(warningsPerType['Info'].length, 1);
        assert(_.isNil(warningsPerType['Warning']));
        assert.equal(warnings[0].ruleId,' lazy-no-linter-warnings ');
    },
    catch: ASSERT_FALSE
},
{
    name: '200 - Ignore once',
    params: {
        path: '/src/test.js',
        language: 'JavaScript',
        content: '/* lazy ignore-once no-tabs */',
        context: require('./testdata1.json')
    },
    then: (results) => {
        const warnings = results.warnings;
        assert.equal(warnings.length, 2);
        const warningsPerType = _.groupBy(warnings, (warning) => warning.type);
        assert.equal(warningsPerType['Error'].length, 1);
        assert.equal(warningsPerType['Info'].length, 1);
    },
    catch: ASSERT_FALSE
},
{
    name: '200 - Ignore current line',
    params: {
        path: '/src/test.js',
        language: 'JavaScript',
        content: `some.code.at.line(1)
        code with error; // lazy ignore`,
        context: require('./testdata1.json')
    },
    then: (results) => {
        const warnings = results.warnings;
        assert.equal(warnings.length, 2);
        const warningsPerType = _.groupBy(warnings, (warning) => warning.type);
        assert.equal(warningsPerType['Error'].length, 1);
        assert.equal(warningsPerType['Info'].length, 1);
    },
    catch: ASSERT_FALSE
},
{
    name: '200 - Ignore current line w/ comment',
    params: {
        path: '/src/test.js',
        language: 'JavaScript',
        content: `some.code.at.line(1)
        code with error; // lazy ignore ; ignore all here`,
        context: require('./testdata1.json')
    },
    then: (results) => {
        const warnings = results.warnings;
        assert.equal(warnings.length, 2);
        const warningsPerType = _.groupBy(warnings, (warning) => warning.type);
        assert.equal(warningsPerType['Error'].length, 1);
        assert.equal(warningsPerType['Info'].length, 1);
    },
    catch: ASSERT_FALSE
},
{
    name: '200 - Ignore all',
    params: {
        path: '/src/test.js',
        language: 'JavaScript',
        content: `// lazy ignore-all ; ignore everything`,
        context: require('./testdata.json')
    },
    then: (results) => {
        const warnings = results.warnings;
        assert.equal(warnings.length, 1);
        const warningsPerType = _.groupBy(warnings, (warning) => warning.type);
        assert.equal(warningsPerType['Info'].length, 1);
        assert(_.isNil(warningsPerType['Error']));
        assert(_.isNil(warningsPerType['Warning']));
        assert.equal(warnings[0].ruleId,' lazy-off ');
    },
    catch: ASSERT_FALSE
}
];

const REGEX_FIXTURES = [{
    name: 'no comments',
    comment: 'lazy ignore single',
    expected: { commandStr: '', args: [] }
},
{
    name: 'empty line',
    comment: '',
    expected: { commandStr: '', args: [] }
},
{
    name: 'null line',
    comment: null,
    expected: { commandStr: '', args: [] }
},
{
    name: 'no arguments',
    comment: '// lazy ignore ',
    expected: { commandStr: 'ignore', args: [] }
},
{
    name: '// style, single ignore',
    comment: '// lazy ignore single',
    expected: { commandStr: 'ignore', args: [ 'single' ] }
},
{
    name: '# style, single ignore',
    comment: '# lazy ignore single',
    expected: { commandStr: 'ignore', args: [ 'single' ] }
},
{
    name: '/* */ style, single ignore',
    comment: '/* lazy ignore single  */',
    expected: { commandStr: 'ignore', args: [ 'single' ]}
},
{
    name: '// style, single ignore-once',
    comment: '// lazy ignore-once single',
    expected: { commandStr: 'ignore-once', args: [ 'single' ] }
},
{
    name: '# style, single ignore-once',
    comment: '# lazy ignore-once single',
    expected: { commandStr: 'ignore-once', args: [ 'single' ] }
},
{
    name: '/* */style, single ignore-once',
    comment: '/* lazy ignore-once single  */',
    expected: { commandStr: 'ignore-once', args: [ 'single' ]}
},

{
    name: '// style, multiple ingore',
    comment: '// lazy ignore one two      three  ',
    expected: { commandStr: 'ignore', args: [ 'one', 'two', 'three' ]}
},
{
    name: '// style, multiple ingore w/ comments',
    comment: '// lazy ignore one two      three  ; comment ',
    expected: { commandStr: 'ignore', args: [ 'one', 'two', 'three' ]}
},
{
    name: '# style, multiple ingore',
    comment: '# lazy ignore one two      three  ',
    expected: { commandStr: 'ignore', args: [ 'one', 'two', 'three' ]}
},
{
    name: '# style, multiple ingore w/ comments',
    comment: '# lazy ignore one two      three  ; comment ',
    expected: { commandStr: 'ignore', args: [ 'one', 'two', 'three' ]}
},
{
    name: '/* style, multiple ingore',
    comment: '/* lazy ignore one two      three  */',
    expected: { commandStr: 'ignore', args: [ 'one', 'two', 'three' ]}
},
{
    name: '/* style, multiple ingore w/ comments',
    comment: '/* lazy ignore one two      three  ; comment */',
    expected: { commandStr: 'ignore', args: [ 'one', 'two', 'three' ]}
},

{
    name: '// style, single ingore w/ comments',
    comment: '// lazy ignore        three  ; comment ',
    expected: { commandStr: 'ignore', args: ['three' ]}
},
{
    name: '# style, single ingore w/ comments',
    comment: '# lazy ignore           three  ; comment ',
    expected: { commandStr: 'ignore', args: ['three' ]}
},
{
    name: '/* style, single ingore w/ comments',
    comment: '/* lazy ignore       three  ; comment */',
    expected: { commandStr: 'ignore', args: ['three' ]}
},
];

 describe('Directives RegEx Parser', function () {
        const rewire = require('rewire');
        const testModule = rewire('../postprocessor-engine');
        const PostProcEngineHttpServer = testModule.__get__('PostProcEngineHttpServer');
        const postProc=new PostProcEngineHttpServer();

        _.each(REGEX_FIXTURES, (fixture) => {
            it(fixture.name, function () {
                const response = postProc._parseLine(fixture.comment);
                assert(_.eq(response.commandStr,fixture.expected.commandStr));
                assert(_.isEqual(response.args,fixture.expected.args));
            });
        });
    });

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
