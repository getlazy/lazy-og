'use babel';

// Above must be the absolutely first line in the file otherwise Atom gets confused

/* global atom */
// lazy ignore import/extensions
// lazy ignore arrow-body-style
// lazy ignore lodash/chain-style
// lazy ignore lodash/chaining
// lazy ignore arrow-parens
// lazy ignore no-console

import _ from 'lodash';

import {
    CompositeDisposable
} from 'atom';
import request from 'request';
import escape from 'escape-html';
import os from 'os';
import crypto from 'crypto';
import simpleGit from 'simple-git';
import async from 'async';

type Linter$Provider = Object

//  We assume that no one will edit an actual source code file of 100,000 columns or more.
//  This number is then used to extend the warnings to the entire line rather than just
//  (line, column) coordinates.
const ARBITRARILY_VERY_LARGE_COLUMN_NUMBER = 100000;

//  Map of hashes of running requests and their promises.
const runningRequests = new Map();

module.exports = {
    config: {
        serviceUrl: {
            type: 'string',
            default: 'http://localhost:16827',
            description: 'URL of lazy'
        }
    },

    activate() {
        const self = this;
        // lazy ignore-once global-require
        require('atom-package-deps').install('atom-lazy-linter');

        //  We are interested in *all* scopes as lazy may be doing more than just say linting.
        this.scopes = ['*'];
        this.subscriptions = new CompositeDisposable();
        this.subscriptions.add(atom.config.observe('atom-lazy-linter.serviceUrl', (serviceUrl) => {
            self.serviceUrl = serviceUrl;
        }));
    },

    deactivate() {
        this.subscriptions.dispose();
    },

    getDirectoryForPath(path) {
        return _.find(atom.project.getDirectories(), (directory) => {
            return directory.contains(path);
        });
    },

    /**
    * Calculate the difference between local (not commited) and
    * remote (commited) line numbers.
    */
    getUpdatedLineNumber(line, fileText, filePath, repository) {
        const diffs = repository.getLineDiffs(filePath, fileText);

        let newLine = line;

        _.forEach(diffs, (diff) => {
            if (diff.oldStart < line) {
                newLine = (newLine - diff.oldLines) + diff.newLines;
            }
        });
        return (newLine <= 0) ? 1 : newLine;
    },

    provideLinter(): Linter$Provider {
        const linter = {
            name: 'lazy',
            grammarScopes: this.scopes,
            scope: 'file',
            lintOnFly: true,
            lintOnFlyInterval: 250,
            /* Don't trigger lazy too often when typing */
            lint: async(editor) => {
                const self = this;
                const path = editor.getPath();
                const grammar = editor.getGrammar().name;
                //  We need to capture the file content at the moment lazy package
                //  was invoked so that we can later ensure that the results
                //  correspond to the same content for which the analysis was done.
                const fileContents = editor.getText();
                const requestHash = crypto
                    .createHash('sha256')
                    .update([path, grammar, fileContents].join('|'))
                    .digest('hex');
                const runningRequestPromise = runningRequests.get(requestHash);
                if (!_.isUndefined(runningRequestPromise)) {
                    return runningRequestPromise;
                }
                //  Create the promise and then add it to the map of running requests.
                const promise = self.getRepoInfoForPath(path)
                .then((repoInfo) => {
                    //  TODO: Cache the results for at least a little while to avoid unnecessary slowdowns.
                    return self.makeRequest(path, grammar, fileContents, repoInfo);
                })
                .then((requestResults) => {
                    const {
                        err,
                        response,
                        body
                    } = requestResults;

                    if (err) {
                        return Promise.resolve([{
                            type: 'Error',
                            text: err.message,
                            filePath: editor.getPath()
                        }]);
                    }

                    if (editor.getText() !== fileContents) {
                        // File has changed since the analysis was triggered so rerun it.
                        return linter.lint(editor);
                    }

                    if (response.statusCode !== 200) {
                        let message = `lazy service failed with ${response.statusCode} status code`;
                        if (body && body.error) {
                            message += ` (${body.error})`;
                        }
                        return Promise.resolve([{
                            type: 'Error',
                            text: message,
                            filePath: editor.getPath()
                        }]);
                    }

                    const directory = self.getDirectoryForPath(path);

                    return atom.project.repositoryForDirectory(directory)
                    .then((repository) => {
                        // For warnings that are comming from Pull Requests
                        // we need to update line number to accomodate for
                        // not commited local edits
                        const updatedWarnings = _.map(body.warnings, (warning) => {
                            const updatedWarning = warning;
                            if ((!_.isNil(repository)) && (_.isEqual(warning.type, 'PR'))) {
                                updatedWarning.line = self.getUpdatedLineNumber(
                                    warning.line, fileContents, path, repository);
                            }
                            return updatedWarning;
                        });

                        //  Group all the warnings per their line and then
                        //  merge all warnings on the same line into a single warning.
                        const results = _
                            .chain(updatedWarnings)
                            .groupBy('line')
                            .map((warningsPerLine, line) => {
                                //  Screen coordinate system is rooted in (0,0) rather than (1,1)
                                const screenLine = _.toNumber(line) - 1;

                                //  Sort the warnings in descending order of severity.
                                const sortedWarnings = _
                                    .chain(warningsPerLine)
                                    .sortBy((warning) => {
                                        switch (_.toLower(warning.type)) {
                                            case 'warning':
                                                return 1;
                                            case 'error':
                                                return 2;
                                            default:
                                                return 0;
                                        }
                                    })
                                    .reverse()
                                    .value();

                                return {
                                    type: _.head(sortedWarnings).type || 'Warning',
                                    html: _.map(sortedWarnings,
                                        (warning) => {
                                            let moreInfo = '';
                                            if (!_.isNil(warning.moreInfo)) {
                                                moreInfo = ` <a href="${warning.moreInfo}">more &raquo;</a>`;
                                            }
                                            return escape(warning.message) + moreInfo;
                                        }).join('<br>'),
                                        //  We always show all the warnings on the entire line rather than just on
                                        //  (line, column).
                                    range: [
                                            [screenLine, 0],
                                            [screenLine, ARBITRARILY_VERY_LARGE_COLUMN_NUMBER]
                                    ],
                                    filePath: editor.getPath()
                                };
                            })
                            .value();
                        return Promise.resolve(results);
                    });
                })
                .then((result) => {
                    //  Delete the request from the map of running requests.
                    runningRequests.delete(requestHash);
                    return Promise.resolve(result);
                })
                .catch((err) => {
                    //  Delete the request from the map of running requests.
                    runningRequests.delete(requestHash);
                    return Promise.reject(err);
                });
                runningRequests.set(requestHash, promise);
                return promise;
            }
        };
        return linter;
    },

    getLocalFileInfo(fullPath) {
        const pathInfo = atom.project.relativizePath(fullPath);
        return {
            baseDir: pathInfo[0],
            relativePath: pathInfo[1]
        };
    },

    getRepoInfoForPath(path) {
        const self = this;

        const directory = self.getDirectoryForPath(path);

        if (_.isNil(directory)) {
            return null;
        }

        return atom.project.repositoryForDirectory(directory)
        .then((repository) => {
            if (_.isNil(repository)) {
                return null;
            }

            return new Promise((resolve) => {
                const git = simpleGit(repository.getWorkingDirectory());
                async.parallel(async.reflectAll(
                    [_.bind(git.getRemotes, git, true), git.status.bind(git), git.branch.bind(git)]),
                    (err, reflectedResults) => {
                        if (err) {
                            console.log('Error getting complete repository info', err);
                        }
                        //  Log all the errors if any but return anything you have collected.
                        _(reflectedResults).filter('err').forEach(result =>
                            console.log('Error getting repository info', result.err));

                        const [reflectedRemotes, reflectedStatus, reflectedBranches] = reflectedResults;
                        const repoInfo = {
                            type: repository.getType(),
                            remotes: reflectedRemotes.value,
                            status: reflectedStatus.value,
                            branches: _.get(reflectedBranches.value, 'branches'),
                            fileInfo: self.getLocalFileInfo(path)
                        };

                        return resolve(repoInfo);
                    }
                );
            });
        });
    },
    makeRequest(path, grammar, fileContents, repoInfo) {
        const self = this;

        return new Promise((resolve) => {
            const requestParams = {
                method: 'POST',
                url: `${self.serviceUrl}/file`,
                json: true,
                headers: {
                    Accept: 'application/json',
                    'X-LazyApi-Version': 'v20161217'
                },
                body: {
                    hostPath: path,
                    language: grammar,
                    content: fileContents,
                    context: {
                        host: os.hostname(),
                        client: `atom@${atom.getVersion()}`,
                        repositoryInformation: repoInfo
                    }
                }
            };

            request(requestParams, (err, response, body) => {
                resolve({
                    err,
                    response,
                    body
                });
            });
        });
    }
};
