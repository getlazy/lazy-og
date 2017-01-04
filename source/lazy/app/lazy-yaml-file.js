
'use strict';

const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const async = require('async');

class LazyYamlFile {
    static load(filePath) {
        return new Promise((resolve, reject) => {
            fs.readFile(filePath, 'utf8', (err, content) => {
                if (err) {
                    reject(err);
                    return;
                }

                const config = yaml.safeLoad(content);

                //  Now resolve the config clauses and include the content in them.
                resolve(LazyYamlFile._resolveIncludeClauses(config));
            });
        });
    }

    static _resolveIncludeClauses(config) {
        const resolvedConfig = _.cloneDeep(config);

        if (!_.isObject(resolvedConfig)) {
            return Promise.resolve(resolvedConfig);
        }

        return new Promise((resolve, reject) => {
            //  Iterate over config and not resolvedConfig as the latter might be changed during
            //  the iteration and we don't support higher order ~include resolution anyway
            //  (that is resolution of ~include clauses in data loaded from a previous ~include)
            async.eachOf(config, (clauseContent, clause, nextClause) => {
                if (clause === '~include') {
                    let includeFilePath = clauseContent;
                    if (!path.isAbsolute(includeFilePath)) {
                        includeFilePath = path.resolve(includeFilePath);
                    }
                    fs.readFile(includeFilePath, 'utf8', (err, includeFileContent) => {
                        if (err) {
                            nextClause(err);
                            return;
                        }

                        const includedConfig = yaml.safeLoad(includeFileContent);
                        //  Delete the ~include clause and instead of it assign the *resolved*
                        //  included config.
                        //  Currently we don't support deeper resolution of included configs so
                        //  we don't follow this down any further path.
                        LazyYamlFile._resolveIncludeClauses(includedConfig)
                            .then((resolvedClauseConfig) => {
                                delete resolvedConfig[clause];
                                _.assignIn(resolvedConfig, resolvedClauseConfig);
                                nextClause();
                            });
                    });
                    return;
                }

                LazyYamlFile._resolveIncludeClauses(clauseContent)
                    .then((resolvedClauseConfig) => {
                        resolvedConfig[clause] = resolvedClauseConfig;
                        nextClause();
                    })
                    .catch(nextClause);
            }, (err) => {
                if (err) {
                    reject(err);
                    return;
                }

                resolve(resolvedConfig);
            });
        });
    }

    static save(filePath, data) {
        return new Promise((resolve, reject) => {
            const content = yaml.safeDump(data, {
                indent: 4
            });
            fs.writeFile(filePath, content, (err) => {
                if (err) {
                    return reject(err);
                }

                return resolve();
            });
        });
    }
}

module.exports = LazyYamlFile;
