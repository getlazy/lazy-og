'use babel'; // this must be the absolutely first line in the file otherwise Atom gets confused

import _ from 'lodash';

import {CompositeDisposable} from 'atom';
import request from 'request';
import escape from 'escape-html';
import os from 'os';
import crypto from 'crypto';
import simpleGit from 'simple-git';

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

  provideLinter(): Linter$Provider {
    const linter = {
      name: 'lazy',
      grammarScopes: this.scopes,
      scope: 'file',
      lintOnFly: true,
      lint: async (editor) => {
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
            const {err, response, body} = requestResults;

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
              let message = 'lazy service failed with ' + response.statusCode + ' status code';
              if (body && body.error) {
                message += ' (' + body.error + ')';
              }
              return Promise.resolve([{
                type: 'Error',
                text: message,
                filePath: editor.getPath()
              }]);
            }

            //  Group all the warnings per their line and then
            //  merge all warnings on the same line into a single warning.
            const results = _
              .chain(body.warnings)
              .groupBy((warning) => warning.line)
              .map((warnings, line) => {
                //  Screen coordinate system is rooted in (0,0) rather than (1,1)
                line = _.toNumber(line) - 1;

                //  Sort the warnings in descending order of severity.
                warnings = _
                  .chain(warnings)
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
                  type: _.first(warnings).type || 'Warning',
                  html: _.map(warnings,
                    (warning) => escape(warning.message)).join('<br>'),
                  //  We always show all the warnings on the entire line rather than just on
                  //  (line, column).
                  range: [[line, 0], [line, ARBITRARILY_VERY_LARGE_COLUMN_NUMBER]],
                  filePath: editor.getPath()
                };
              })
              .value();

            return Promise.resolve(results);
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

  getRepoInfoForPath(path) {
    const directory = _.find(atom.project.getDirectories(), (directory) => {
      return directory.contains(path);
    });

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
          git.getRemotes(true, (err, remotes) => {
            if (err) {
              console.log('Error getting repo remotes', err);
              //  Don't fail the operation, we will return what we can.
            }

            git.status((err, status) => {
              if (err) {
                console.log('Error getting repo status', err);
                //  Don't fail the operation, we will return what we can.
              }

              return resolve({
                remotes: remotes,
                status: status
              });
            });
          });
        });
      });
  },
  makeRequest(path, grammar, fileContents, repoInfo) {
    const self = this;

    return new Promise((resolve) => {
      const requestParams = {
        method: 'POST',
        url: self.serviceUrl + '/file',
        json: true,
        headers: {
          'Accept': 'application/json',
          'X-LazyApi-Version': 'v20161217'
        },
        body: {
          client: 'atom@' + atom.getVersion(),
          host: os.hostname(),
          path: path,
          language: grammar,
          content: fileContents,
          repositoryInformation: repoInfo
        }
      };

      request(requestParams, (err, response, body) => {
        resolve({err, response, body});
      });
    });
  }
};
