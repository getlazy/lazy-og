'use strict';

const _ = require('lodash');
const assert = require('assert');

const testData = require('./testdata.json');
const testData1 = require('./testdata1.json');

module.exports = [{
    id: '200 - pass context warnings without changes',
    params: {
        path: '/src/test.js',
        language: 'JavaScript',
        content: '',
        context: testData
    },
    then: (results) => {
        const warnings = results.warnings;

        assert.equal(warnings.length, 20);
        const warningsPerType = _.groupBy(warnings, 'type');
        assert.equal(warningsPerType.Error.length, 11);
        assert.equal(warningsPerType.Info.length, 8);
        assert.equal(warningsPerType.Warning.length, 1);
    }
},
{
    id: '200 - remove all YamlRule1 rule ids with line comment directive',
    params: {
        path: '/src/test.js',
        language: 'JavaScript',
        content: '// lazy ignore yamlrule1',
        context: testData
    },
    then: (results) => {
        const warnings = results.warnings;
        assert.equal(warnings.length, 18);
        const warningsPerType = _.groupBy(warnings, 'type');
        assert.equal(warningsPerType.Error.length, 11);
        assert.equal(warningsPerType.Info.length, 7);
        assert(_.isNil(warningsPerType.Warning));
    }
},
{
    id: '200 - remove all YamlRule1 rule ids with block comment directive',
    params: {
        path: '/src/test.js',
        language: 'JavaScript',
        content: '/* lazy ignore yamlrule1 */',
        context: testData
    },
    then: (results) => {
        const warnings = results.warnings;
        assert.equal(warnings.length, 18);
        const warningsPerType = _.groupBy(warnings, 'type');
        assert.equal(warningsPerType.Error.length, 11);
        assert.equal(warningsPerType.Info.length, 7);
        assert(_.isNil(warningsPerType.Warning));
    }
},
{
    id: '200 - handle case w/ no previous messages',
    params: {
        path: '/src/test.js',
        language: 'JavaScript',
        content: '/* lazy ignore yamlrule1 */',
        context: ''
    },
    then: (results) => {
        const warnings = results.warnings;
        assert.equal(warnings.length, 1);
        const warningsPerType = _.groupBy(warnings, 'type');
        assert(_.isNil(warningsPerType.Error));
        assert.equal(warningsPerType.Info.length, 1);
        assert(_.isNil(warningsPerType.Warning));
        assert.equal(warnings[0].ruleId, ' lazy-no-linters-defined ');
    }
},
{
    id: '200 - handle case w/ no previous messages 2',
    params: {
        path: '/src/test.js',
        language: 'JavaScript',
        content: '/* lazy ignore yamlrule1 */',
        context: {
            previousStepResults: { status: {codeChecked: true} }
        }
    },
    then: (results) => {
        const warnings = results.warnings;
        assert.equal(warnings.length, 1);
        const warningsPerType = _.groupBy(warnings, 'type');
        assert(_.isNil(warningsPerType.Error));
        assert.equal(warningsPerType.Info.length, 1);
        assert(_.isNil(warningsPerType.Warning));
        assert.equal(warnings[0].ruleId, ' lazy-no-linter-warnings ');
    }
},
{
    id: '200 - handle case w/ no previous messages 3',
    params: {
        path: '/src/test.js',
        language: 'JavaScript',
        content: '/* lazy ignore yamlrule1 */',
        context: null
    },
    then: (results) => {
        const warnings = results.warnings;
        assert.equal(warnings.length, 1);
        const warningsPerType = _.groupBy(warnings, 'type');
        assert(_.isNil(warningsPerType.Error));
        assert.equal(warningsPerType.Info.length, 1);
        assert(_.isNil(warningsPerType.Warning));
        assert.equal(warnings[0].ruleId, ' lazy-no-linters-defined ');
    }
},
{
    id: '200 - Ignore once',
    params: {
        path: '/src/test.js',
        language: 'JavaScript',
        content: '/* lazy ignore-once no-tabs */',
        context: testData1
    },
    then: (results) => {
        const warnings = results.warnings;
        assert.equal(warnings.length, 2);
        const warningsPerType = _.groupBy(warnings, 'type');
        assert.equal(warningsPerType.Error.length, 1);
        assert.equal(warningsPerType.Info.length, 1);
    }
},
{
    id: '200 - Ignore current line',
    params: {
        path: '/src/test.js',
        language: 'JavaScript',
        content: `some.code.at.line(1)
        code with error; // lazy ignore`,
        context: testData1
    },
    then: (results) => {
        const warnings = results.warnings;        
        assert.equal(warnings.length, 3);
        const warningsPerType = _.groupBy(warnings, 'type');
        assert.equal(warningsPerType.Error.length, 1);
        assert.equal(warningsPerType.Info.length, 1);
        assert.equal(warningsPerType.Warning.length, 1);
    }
},
{
    id: '200 - Ignore current line w/ comment',
    params: {
        path: '/src/test.js',
        language: 'JavaScript',
        content: `some.code.at.line(1)
        code with error; // lazy ignore ; ignore all here`,
        context: testData1
    },
    then: (results) => {
        const warnings = results.warnings;
        assert.equal(warnings.length, 2);
        const warningsPerType = _.groupBy(warnings, 'type');
        assert.equal(warningsPerType.Error.length, 1);
        assert.equal(warningsPerType.Info.length, 1);
    }
},
{
    id: '200 - Ignore all',
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
    }
},
{
    id: '200 - Ignore-start no ignore-end',
    params: {
        path: '/src/test.js',
        language: 'JavaScript',
        content: `// lazy ignore-start ; ignore everything`,
        context: require('./testdata.json')
    },
    then: (results) => {
        const warnings = results.warnings;

        assert.equal(warnings.length, 1);
        const warningsPerType = _.groupBy(warnings, (warning) => warning.type);
        assert(_.isNil(warningsPerType['Error']));
        assert.equal(warningsPerType['Info'].length, 1);
        assert(_.isNil(warningsPerType['Warning']));
        assert.equal(warnings[0].ruleId,' lazy-no-linter-warnings ');
    }
},
{
    id: '200 - Ignore-start and ignore-end',
    params: {
        path: '/src/test.js',
        language: 'JavaScript',
        content: `// lazy ignore-start ; ignore everything
        const some_code_with_warning = null;
        // lazy ignore-end`,
        context: require('./testdata1.json')
    },
    then: (results) => {
        const warnings = results.warnings;
        assert.equal(warnings.length, 2);
        const warningsPerType = _.groupBy(warnings, (warning) => warning.type);
        assert.equal(warningsPerType['Error'].length, 1);
        assert.equal(warningsPerType['Info'].length, 1);
        assert(_.isNil(warningsPerType['Warning']));
    }
}
];
