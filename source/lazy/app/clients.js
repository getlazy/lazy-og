
'use strict';

const _ = require('lodash');

//  TODO: Absolutely hacked together. Do the proper class hierarchy and factory
//  when and if you get traction.

const ClientGenerators = {
    atom: (version) => {
        //  Ignore the version for now.
        return {
            translateGrammarToLanguage: (grammar) => {
                switch (grammar) {
                    case 'JavaScript':
                    case 'C++':
                    case 'C':
                    case 'Objective-C':
                    case 'Objective-C++':
                    case 'PHP':
                    case 'HTML':
                    case 'Java':
                        return grammar;
                    case 'Less':
                    case 'SCSS':
                        //  We use lower case for these languages.
                        return _.toLower(grammar);
                    case 'CSS':
                        //  SCSS is a superset of CSS.
                        return 'scss';
                    default:
                        logger.warn('Unknown grammar', grammar);
                        return null;
                }
            }
        };
    }
};

const getClient = (clientTag) => {
    if (!_.isString(clientTag)) {
        return null;
    }

    const parsedClientTag = clientTag.split('@');
    const clientGenerator = ClientGenerators[parsedClientTag[0]];
    if (!_.isFunction(clientGenerator)) {
        logger.warn('Unknown client', clientTag);
        return null;
    }

    const client = clientGenerator(parsedClientTag[1]);
    if (!_.isObject(client)) {
        logger.warn('Invalid client version', clientTag);
        return null;
    }

    return client;
};

module.exports = {
    getClient: getClient
};
