'use strict';

module.exports = [{
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
    expected: { commandStr: 'ignore', args: ['single'] }
},
{
    name: '# style, single ignore',
    comment: '# lazy ignore single',
    expected: { commandStr: 'ignore', args: ['single'] }
},
{
    name: '/* */ style, single ignore',
    comment: '/* lazy ignore single  */',
    expected: { commandStr: 'ignore', args: ['single'] }
},
{
    name: '// style, single ignore-once',
    comment: '// lazy ignore-once single',
    expected: { commandStr: 'ignore-once', args: ['single'] }
},
{
    name: '# style, single ignore-once',
    comment: '# lazy ignore-once single',
    expected: { commandStr: 'ignore-once', args: ['single'] }
},
{
    name: '/* */style, single ignore-once',
    comment: '/* lazy ignore-once single  */',
    expected: { commandStr: 'ignore-once', args: ['single'] }
},

{
    name: '// style, multiple ingore',
    comment: '// lazy ignore one two      three  ',
    expected: { commandStr: 'ignore', args: ['one', 'two', 'three'] }
},
{
    name: '// style, multiple ingore w/ comments',
    comment: '// lazy ignore one two      three  ; comment ',
    expected: { commandStr: 'ignore', args: ['one', 'two', 'three'] }
},
{
    name: '# style, multiple ingore',
    comment: '# lazy ignore one two      three  ',
    expected: { commandStr: 'ignore', args: ['one', 'two', 'three'] }
},
{
    name: '# style, multiple ingore w/ comments',
    comment: '# lazy ignore one two      three  ; comment ',
    expected: { commandStr: 'ignore', args: ['one', 'two', 'three'] }
},
{
    name: '/* style, multiple ingore',
    comment: '/* lazy ignore one two      three  */',
    expected: { commandStr: 'ignore', args: ['one', 'two', 'three'] }
},
{
    name: '/* style, multiple ingore w/ comments',
    comment: '/* lazy ignore one two      three  ; comment */',
    expected: { commandStr: 'ignore', args: ['one', 'two', 'three'] }
},

{
    name: '// style, single ingore w/ comments',
    comment: '// lazy ignore        three  ; comment ',
    expected: { commandStr: 'ignore', args: ['three'] }
},
{
    name: '# style, single ingore w/ comments',
    comment: '# lazy ignore           three  ; comment ',
    expected: { commandStr: 'ignore', args: ['three'] }
},
{
    name: '/* style, single ingore w/ comments',
    comment: '/* lazy ignore       three  ; comment */',
    expected: { commandStr: 'ignore', args: ['three'] }
}
];
