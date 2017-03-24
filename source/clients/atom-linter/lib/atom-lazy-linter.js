'use babel';

// Above must be the absolutely first line in the file otherwise Atom gets confused

/* global atom */
// lazy ignore import/extensions arrow-body-style lodash/chain-style lodash/chaining
// lazy ignore arrow-parens no-console lodash/import-scope

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
const LAZY_HOMEPAGE = 'http://beta.getlazy.io';

//  Map of hashes of running requests and their promises.
const runningRequests = new Map();

module.exports = {
  config: {
    serviceUrl: {
      type: 'string',
      default: 'http://localhost:16827',
      description: 'URL of lazy.'
    },
    lazyToken: {
      type: 'string',
      default: '',
      description: 'Get your token at http://beta.getlazy.io and paste it here.'
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
    this.subscriptions.add(atom.config.observe('atom-lazy-linter.lazyToken', (lazyToken) => {
      self.lazyToken = lazyToken;
    }));
  },

  deactivate() {
    this.subscriptions.dispose();
  },

  getProjectDirectoryForPath(path) {
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
      lintsOnChange: true,
      /* Don't trigger lazy too often when typing */
      lint: async(editor) => {
        const self = this;
        const filePath = editor.getPath();
        const grammar = editor.getGrammar().name;
        //  We need to capture the file content at the moment lazy package
        //  was invoked so that we can later ensure that the results
        //  correspond to the same content for which the analysis was done.
        const fileContents = editor.getText();
        const requestHash = crypto
          .createHash('sha256')
          .update([filePath, grammar, fileContents].join('|'))
          .digest('hex');
        const runningRequestPromise = runningRequests.get(requestHash);
        if (!_.isUndefined(runningRequestPromise)) {
          return runningRequestPromise;
        }
        //  Create the promise and then add it to the map of running requests.
        const promise = self.getRepoInfoForPath(filePath)
          .then((repoInfo) => {
            //  TODO: Cache the results for at least a little while to avoid unnecessary slowdowns.
            return self.makeRequest(filePath, grammar, fileContents, repoInfo);
          })
          .then((requestResults) => {
            const {
              err,
              response,
              body
            } = requestResults;

            if (err) {
              return Promise.resolve([{
                severity: 'error',
                excerpt: `lazy: ${err.message}`,
                url: LAZY_HOMEPAGE,
                location: {
                  file: filePath,
                  position: [
                    [0, 0],
                    [0, 1]
                  ]
                }
              }]);
            }

            if (editor.getText() !== fileContents) {
              // File has changed since the analysis was triggered so rerun it.
              return linter.lint(editor);
            }

            if (response.statusCode !== 200) {
              let severity;
              let excerpt;
              let description;

              switch (response.statusCode) {
                case 503:
                  severity = 'info';
                  excerpt = 'Hey sorry, lazy service is not yet ready to accept requests. Retry in a bit!';
                  break;
                default:
                  severity = 'error';
                  excerpt = `lazy service failed with ${response.statusCode} status code`;
                  if (body && body.error) {
                    description = `(${body.error})`;
                  }
                  break;
              }

              return Promise.resolve([{
                severity,
                excerpt,
                url: LAZY_HOMEPAGE,
                location: {
                  file: filePath,
                  position: [
                    [0, 0],
                    [0, 1]
                  ]
                }
              }]);
            }

            const directory = self.getProjectDirectoryForPath(filePath);


            return new Promise((resolve) => {
                //  Directory is nil if the file is not in the project.
                if (!directory) {
                  resolve(null);
                  return;
                }

                resolve(atom.project.repositoryForDirectory(directory));
              })
              .then((repository) => self._processResults(
                filePath, fileContents, body.warnings, repository));
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

    const directory = self.getProjectDirectoryForPath(path);

    if (_.isNil(directory)) {
      return Promise.resolve(null);
    }

    return atom.project.repositoryForDirectory(directory)
      .then((repository) => {
        if (_.isNil(repository)) {
          return Promise.resolve(null);
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

    let proxyPath = '';
    let apikeyHeader = '';
    if (!_.isEmpty(self.lazyToken)) {
      proxyPath = 'golazy/';
      apikeyHeader = self.lazyToken;
    }
    return new Promise((resolve) => {

      const requestParams = {
        method: 'POST',
        url: `${self.serviceUrl}/${proxyPath}file`,
        json: true,
        headers: {
          Accept: 'application/json',
          'X-LazyApi-Version': 'v20161217',
          apikey: apikeyHeader
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
  },

  _processResults(path, fileContents, warnings, repository) {
    const self = this;

    // For warnings that are comming from Pull Requests
    // we need to update line number to accomodate for
    // not commited local edits
    const updatedWarnings = _.map(warnings, (warning) => {
      const updatedWarning = warning;
      if ((!_.isNil(repository)) && (_.isEqual(warning.type, 'PR'))) {
        updatedWarning.line = self.getUpdatedLineNumber(
          warning.line, fileContents, path, repository);
      }
      return updatedWarning;
    });

    const re = _.map(updatedWarnings, (warn) => {
      const screenLine = _.toNumber(_.get(warn, 'line', 1)) - 1;
      const screenCol = _.toNumber(_.get(warn, 'column', 1)) - 1;
      return {
        severity: _.toLower(_.get(warn, 'type', 'warning')),
        excerpt: escape(_.get(warn, 'message', 'n/a')),
        url: _.get(warn, 'moreInfo', LAZY_HOMEPAGE),
        location: {
          file: path,
          position: [
            [screenLine, screenCol],
            [screenLine, ARBITRARILY_VERY_LARGE_COLUMN_NUMBER]
          ]
        }
      }
    });
    return Promise.resolve(re);
  }
};
