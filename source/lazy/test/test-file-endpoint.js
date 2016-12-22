
'use strict';

const _ = require('lodash');
const assert = require('assert');

const ASSERT_FALSE = (data) => {
    logger.error(data);
    assert(false);
};

const FILE_FIXTURES = [{
    name: '200 - HTML',
    params: {
        path: '/src/test.html',
        language: 'HTML',
        content:
`
<html>
?</htx>

;<vxskfds,\`czjd<\`
`
    },
    then: (results) => {
        const warnings = results.warnings;
        assert.equal(warnings.length, 10);
        const warningsPerType = _.groupBy(warnings, (warning) => warning.type);
        assert.equal(warningsPerType['Error'].length, 1);
        assert.equal(warningsPerType['Warning'].length, 8);
        assert.equal(warningsPerType['Info'].length, 1);
    },
    catch: ASSERT_FALSE
}, {
    name: '200 - C++',
    params: {
        path: '/src/test.cpp',
        language: 'C++',
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
        path: '/src/test.c',
        language: 'C',
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
}, {
    name: '200 - PHP',
    params: {
        path: '/src/test.php',
        language: 'PHP',
        content:
`
<?php

class a {};

    class a = 'XYZ';

include "hohoho.php";

class a = 'XYZ';
class a = 'XYZ';
// class a = 'XYZ';

?>
`
    },
    then: (results) => {
        const warnings = results.warnings;
        assert.equal(warnings.length, 1);
        const warningsPerType = _.groupBy(warnings, (warning) => warning.type);
        assert.equal(warningsPerType['Error'].length, 1);
    },
    catch: ASSERT_FALSE
}, {
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
}, {
    name: '200 - CSS',
    params: {
        path: '/src/test.css',
        language: 'CSS',
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
    name: '200 - SCSS',
    params: {
        path: '/src/test.scss',
        language: 'SCSS',
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
        language: 'Less',
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
}, {
    name: '200 - JavaScript',
    params: {
        path: '/src/test.js',
        language: 'JavaScript',
        content:
`
'use strict';

var x = 0;
`
    },
    then: (results) => {
        const warnings = results.warnings;
        assert.equal(warnings.length, 2);
        const warningsPerType = _.groupBy(warnings, (warning) => warning.type);
        assert.equal(warningsPerType['Warning'].length, 2);
        assert.equal(warnings[0].message, 'Unexpected var, use let or const instead.');
        assert.equal(warnings[1].message, '\'x\' is assigned a value but never used.');
    },
    catch: ASSERT_FALSE
}, {
    name: '200 - JavaScript (error)',
    params: {
        path: '/src/test.js',
        language: 'JavaScript',
        content:
`
var x =
`
    },
    then: (results) => {
        const warnings = results.warnings;
        assert.equal(warnings.length, 1);
        const warningsPerType = _.groupBy(warnings, (warning) => warning.type);
        assert.equal(warningsPerType['Error'].length, 1);
        assert.equal(warnings[0].message, 'Parsing error: Unexpected token');
    },
    catch: ASSERT_FALSE
}];

describe('/file', function() {
    this.timeout(15000);

    before(function() {
        this.timeout(150000);
        return require('./bootstrap').start();
    });

    after(function() {
        this.timeout(150000);
        return require('./bootstrap').stop();
    });

    describe('supports version v20161217', function() {
        const LazyClient = require('@lazyass/node-lazy-client').getClientClass('v20161217');
        const lazyUrl = 'http://0.0.0.0:' + (process.env.PORT || 80);

        it('version', function(done) {
            let client = new LazyClient(lazyUrl);
            client.version()
                .then((version) => {
                    assert.equal(version.api, 'v20161217');
                    done();
                })
                .catch(done);
        });

        describe('analyzeFile', function() {
            let onlyFixtures = _.filter(FILE_FIXTURES, (fixture) => fixture.only);
            if (_.isEmpty(onlyFixtures)) {
                onlyFixtures = FILE_FIXTURES;
            }
            _.each(onlyFixtures, (fixture) => {
                let params = fixture.params;
                it(fixture.name, function(done) {
                    let client = new LazyClient(lazyUrl, params.client);
                    client.analyzeFile(params.content, params.path, params.language)
                        .then(fixture.then)
                        .catch(fixture.catch)
                        .then(done)
                        .catch(done);
                });
            });
        });
    });
});
