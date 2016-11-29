
'use strict';

//  Code picked up from atom-linter project (MIT license) and adapted for our purposes.

const NamedRegexp = require('named-js-regexp');

/**
 * Parses the string output data (from different linters) with the given regex
 * and transforms it into array of objects that our front-end clients can
 * render.
 * @param {string} data the entire linter output
 * @param {RegExp} regex regular expression object designed for the particular
 * linter output
 * @param {object} givenOptions additional options used during parsing
 * @return {array} array of error/warning objects resulting from the analysis
 */
const parse = (data, regex, givenOptions) => {
    if (typeof data !== 'string') {
        throw new Error('Invalid or no `data` provided');
    } else if (typeof regex !== 'string') {
        throw new Error('Invalid or no `regex` provided');
    } else if (typeof givenOptions !== 'object') {
        givenOptions = {};
    }

    const defaultOptions = {flags: ''};
    const options = Object.assign(defaultOptions, givenOptions);
    if (options.flags.indexOf('g') === -1) {
        options.flags += 'g';
    }

    const messages = [];
    const compiledRegexp = new NamedRegexp(regex, options.flags);
    let rawMatch = compiledRegexp.exec(data);

    while (rawMatch !== null) {
        const match = rawMatch.groups();
        const type = match.type;
        const message = match.message;
        const file = match.file || options.filePath || null;

        const lineStart = match.lineStart || match.line || 1;
        const colStart = match.colStart || match.col || 1;

        messages.push({
            type,
            message,
            filePath: file,
            line: lineStart > 0 ? lineStart : 1,
            column: colStart > 0 ? colStart : 1
        });

        rawMatch = compiledRegexp.exec(data);
    }

    return messages;
};

module.exports = {
    parse: parse
};
