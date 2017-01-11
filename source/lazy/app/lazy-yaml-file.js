
'use strict';

/* global logger */

const _ = require('lodash');
const fs = require('fs-promise');
const path = require('path');
const yaml = require('js-yaml');
const async = require('async');
const Ajv = require('ajv');

//  LAZY_CONFIG_SCHEMA is defined at the end of the file but set during module loading.
let LAZY_CONFIG_SCHEMA;

class LazyYamlFile {
    static load(filePath) {
        const fileDirname = path.dirname(path.resolve(filePath));

        return LazyYamlFile._readFile(filePath)
            .then((content) => {
                const config = yaml.safeLoad(content);

                //  Now resolve the config clauses and include the content in them.
                return LazyYamlFile._resolveIncludeClauses(fileDirname, config);
            })
            .then((resolvedConfig) => {
                const configErrors = LazyYamlFile._getConfigErrors(resolvedConfig);
                if (_.isEmpty(configErrors)) {
                    LazyYamlFile._issueWarnings(resolvedConfig);
                    return resolvedConfig;
                }

                logger.error('errors in lazy configuration', configErrors);
                return Promise.reject(new Error('invalid lazy configuration'));
            });
    }

    static _resolveIncludeClauses(fileDirname, config) {
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
                        includeFilePath = path.resolve(fileDirname, includeFilePath);
                    }

                    LazyYamlFile._readFile(includeFilePath)
                        .then((includeFileContent) => {
                            const includedConfig = yaml.safeLoad(includeFileContent);
                            //  Delete the ~include clause and instead of it assign the *resolved*
                            //  included config.
                            //  Currently we don't support deeper resolution of included configs so
                            //  we don't follow this down any further path.
                            LazyYamlFile._resolveIncludeClauses(fileDirname, includedConfig)
                                .then((resolvedClauseConfig) => {
                                    delete resolvedConfig[clause];
                                    _.assignIn(resolvedConfig, resolvedClauseConfig);
                                    nextClause();
                                });
                        })
                        .catch(nextClause);
                    return;
                }

                LazyYamlFile._resolveIncludeClauses(fileDirname, clauseContent)
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

    static _getConfigErrors(config) {
        const ajv = new Ajv();
        if (ajv.validate(LAZY_CONFIG_SCHEMA, config)) {
            return false;
        }

        return ajv.errors;
    }

    static _issueWarnings(config) {
        //  Nothing to do yet.
    }

    static _readFile(filePath) {
        return fs.readFile(filePath, 'utf8');
    }
}

module.exports = LazyYamlFile;

//  This is executed during module loading.
LAZY_CONFIG_SCHEMA = {
    $schema: 'http://json-schema.org/draft-04/schema#',
    title: 'lazy.yaml schema',
    type: 'object',
    properties: {
        version: {
            type: 'integer',
            minimum: 1,
            maximum: 1
        },
        service_url: {
            type: 'string',
            minLength: 8, // e.g. 'http://a'
            pattern: '^https?:.*'
        },
        id: {
            type: 'string',
            minLength: 1
        },
        repository_auth: {
            type: 'object',
            oneOf: [
                { $ref: '#/definitions/repository_auth_env' },
                { $ref: '#/definitions/repository_auth_token' }
            ]
        },
        port: {
            type: 'integer',
            minimum: 1
        },
        ui: {
            $ref: '#/definitions/engine'
        },
        engine_pipeline: {
            type: 'object',
            minProperties: 1,
            maxProperties: 1,
            properties: {
                bundle: { $ref: '#/definitions/engine_pipeline_array' },
                sequence: { $ref: '#/definitions/engine_pipeline_array' }
            },
            additionalProperties: false
        },
        engines: {
            type: 'object',
            minProperties: 1,
            patternProperties: {
                '^.+$': {
                    $ref: '#/definitions/engine'
                }
            },
            additionalProperties: false
        }
    },
    required: ['version', 'service_url', 'engines', 'engine_pipeline'],
    additionalProperties: false,
    definitions: {
        repository_auth_env: {
            type: 'object',
            properties: {
                username_env: {
                    type: 'string',
                    minLength: 1
                },
                password_env: {
                    type: 'string'
                },
                email_env: {
                    type: 'string',
                    minLength: 1
                }
            },
            required: ['username_env', 'password_env'],
            additionalProperties: false
        },
        repository_auth_token: {
            type: 'object',
            properties: {
                token: {
                    type: 'string',
                    minLength: 1
                }
            },
            required: ['token'],
            additionalProperties: false
        },
        engine: {
            type: 'object',
            properties: {
                image: {
                    type: 'string',
                    minLength: 3,
                    pattern: '^.+:.+$'
                },
                command: {
                    type: 'string',
                    minLength: 1
                },
                working_dir: {
                    type: 'string',
                    minLength: 1
                },
                volumes: {
                    type: 'array',
                    items: {
                        $ref: '#/definitions/volumes_item'
                    },
                    minItems: 1,
                    uniqueItems: true
                },
                port: {
                    type: 'integer',
                    minimum: 1
                },
                boot_wait: {
                    type: 'boolean'
                },
                boot_timeout: {
                    type: 'integer',
                    minimum: 1
                },
                meta: {
                    type: 'object',
                    properties: {
                        languages: {
                            type: 'array',
                            minLength: 0,
                            items: {
                                type: 'string',
                                minLength: 1
                            }
                        }
                    },
                    additionalProperties: true
                },
                env: {
                    type: 'array',
                    items: {
                        $ref: '#/definitions/env_item'
                    },
                    minItems: 1,
                    uniqueItems: true
                },
                import_env: {
                    type: 'array',
                    items: {
                        type: 'string',
                        minLength: 1
                    },
                    minItems: 1,
                    uniqueItems: true
                },
                config: {
                    type: 'object'
                }
            },
            required: ['image'],
            additionalProperties: false
        },
        env_item: {
            type: 'string',
            minLength: 2, // "x=" is a valid definition
            pattern: '^.+=.*$'
        },
        volumes_item: {
            type: 'string',
            minLength: 3, // "/:/" is a valid definition
            pattern: '^.*:.*$'
        },
        engine_pipeline_array: {
            type: 'array',
            minItems: 1,
            items: {
                $ref: '#/definitions/engine_pipeline_item'
            },
            uniqueItems: true
        },
        engine_pipeline_item: {
            type: 'object',
            minProperties: 1,
            maxProperties: 1,
            properties: {
                bundle: { $ref: '#/definitions/engine_pipeline_array' },
                sequence: { $ref: '#/definitions/engine_pipeline_array' }
            },
            patternProperties: {
                '^((?!(bundle|sequence)).)+$': {
                    oneOf: [
                        { type: 'object' },
                        { type: 'null' }
                    ]
                }
            },
            additionalProperties: false
        }
    }
};
