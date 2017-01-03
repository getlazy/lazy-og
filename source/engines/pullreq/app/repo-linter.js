
'use strict';

/* global logger */

const _ = require('lodash');
const low = require('lowdb');
const Octokat = require('octokat');

// TO-DO: this shouldn't be hard coded - github-access can be named
// differently in lazy.yaml (or even non-existing)
const LAZY_ENGINE_GUTHUB_ACCESS_SANDBOX_DIR = '/lazy/sandbox/github-access';

class RepoLinter {
    constructor() {
        // Get github login gredentials
        try {
            const db = low(LAZY_ENGINE_GUTHUB_ACCESS_SANDBOX_DIR + '/logins.json', {
                storage: require('lowdb/lib/file-async')
            });
            this._ghId = db.get('GitHubLogin[0].id').value();
            const ghToken = db.get('GitHubLogin[0].token').value();
            this._octo = new Octokat({
                token: ghToken
            });
            //logger.info('Logging to GitHub as', this._ghId);
        } catch (error) {
            //logger.info('Unable to get GitHub login credentials.');
            this._ghId = '';
            this._ghToken = '';
            this._octo = new Octokat();
        }
    }

    get gitHubUserName() {
        return this._ghId;
    }

    get gitClient() {
        return this._octo;
    }

    /**
     * Extract all the repositoris from the context that should be scanned for PR comments
     * We are interested in all the remote repos (i.s. origins and upstreams)
     * @param {Object} context Context from atom
     * @return {Object[]} List of owners and repos to look into
     */
    static _getAllReposFromContext(context) {
        const repos = _.get(context, 'repositoryInformation.remotes', null);

        if (_.isNil(repos)) {
            return [];
        }

        return _.chain(repos)
            .map((remote) => {
                const httpProtocolRegex = /^https:\/\/github.com\/(.+)\/(.+)\.git/g;
                const httpFetch = httpProtocolRegex.exec(remote.refs.httpFetch);
                if (httpFetch) {
                    return {
                        owner: httpFetch[1],
                        repo: httpFetch[2]
                    };
                }

                const sshProtocolRegex = /^git@github.com:(.+)\/(.+)\.git/g;
                const sshFetch = sshProtocolRegex.exec(remote.refs.fetch);
                if (sshFetch) {
                    return {
                        owner: sshFetch[1],
                        repo: sshFetch[2]
                    };
                }

                logger.warn('Cannot extract owner and repo from remote', remote);

                return null;
            })
            .filter()
            .flatten()
            .value();
    }

    /**
     * Retrieve all open pull requests for a given repo and a branch
     * @param {Object} repo GH repository
     * @param {string} branch Branch too look for PRs
     * @return {Promise} Promise resolving with the list of all open PRs
     */
    _getAllOpenPRs(repo, branch) {
        const self = this;

        return new Promise((resolve, reject) => {
            const ghCallConfig = {
                head: `${self.gitHubUserName}:${branch}`,
                per_page: 100,
                state: 'open'
            };
            //logger.info(`Fetching PRs for: ${repo.owner}/${repo.repo}:${branch}`);
            self.gitClient.repos(repo.owner, repo.repo).pulls.fetch(ghCallConfig)
                .then((firstPagePulls) => {
                    if (_.size(firstPagePulls) === 0) {
                        // No PRs for this repo.
                        // Try with parent repo.
                        self.gitClient.repos(repo.owner, repo.repo).fetch().then((baseRepo) => {
                            if (_.isNil(baseRepo.parent)) {
                                resolve([]); // No parent repo. Give up.
                            }
                            self._getAllOpenPRs({
                                owner: baseRepo.parent.owner.login,
                                repo: baseRepo.parent.name
                            }, branch)
                            .then(() => resolve);
                        });
                    }

                    self._getOtherPages(firstPagePulls, [])
                        .then((allPulls) => {
                            const reducedPulls = _.reduce(allPulls, (result, onePull) => {
                                return _.concat(result, {
                                    number: onePull.number,
                                    owner: repo.owner,
                                    repo: repo.repo
                                });
                            }, []);
                            resolve(reducedPulls);
                        });
                })
                .catch((err) => reject);
        });
    }

    /**
     * Get all comments from a given pull request that are related to a file being analyzed.
     * @param {Object} pullReq PullRequest
     * @param {string} localFilePath File for which we are looking for comments
     * @return {Promise} Promise resolving with all comments for a given file and PR
     */
    _getCommentsForPr(pullReq, localFilePath) {
        const self = this;
        const ghCallConfig = {
            per_page: 100
        };

        return new Promise((resolve, reject) => {
            self.gitClient.repos(pullReq.owner, pullReq.repo).pulls(pullReq.number).comments.fetch(ghCallConfig)
                .then((firstPageComments) => {
                    if (_.isNil(firstPageComments)) {
                        resolve(null);
                    }
                    self._getOtherPages(firstPageComments, [])
                        .then((allComments) => {
                            // Get only comments for the file being currently anaylized
                            const comments = _.filter(allComments, (comment) => {
                                return _.eq(comment.path, localFilePath);
                            });
                            const sortedComments = _.orderBy(comments, ['id'], ['desc']);

                            resolve(sortedComments);
                        });
                })
                .catch((err) => reject);
        });
    }

    /**
     * Get all the comments, from all the PRs associated with the current branch
     * @param {Object[]} repos List of repositories to look for PRs
     * @param {Object} context Context (from atom-linter-plugin)
     * @return {Promise} Promise resolving with all PR comments
     */
    _getPRReviewComments(repos, context) {
        const self = this;
        const trackingBranch = _.get(context, 'repositoryInformation.status.tracking');
        const currentBranch = _.get(context, 'repositoryInformation.status.current');
        const branch = ((_.isNil(trackingBranch)) ? currentBranch : trackingBranch) || 'master';

        // First, get all open PRs from all the repos
        // then for each PR get the comments (asynchronously)
        // and finally combine them into a single list
        return new Promise((resolve) => {
            Promise.all(_.map(repos, (oneRepo) => {
                return self._getAllOpenPRs(oneRepo, branch);
            })).then((allPRsInAllRepos) => {
                const allPullR = _.flatten(allPRsInAllRepos);
                Promise.all(_.map(allPullR, (onePR) => {
                    return self._getCommentsForPr(onePR, _.get(context, 'repositoryInformation.fileInfo.relativePath', '_'));
                })).then((allCommentsInAllPRs) => {
                    if (_.isNil(allCommentsInAllPRs)) {
                        resolve([]);
                    }
                    const allC = _.flatten(allCommentsInAllPRs);
                    resolve(self._processComments(allC));
                });
            });
        });
    }

    /**
     * Obtains all pages of results from paged GitHup API invocation
     * and merges the results into a single list.
     * @param {Object} onePage One page of the GutHub results
     * @param {Object[]} accumulator Results from previous pages ([] for first page)
     * @return {Promise} Promise resolving with the accumulated results from all pages
     */
    _getOtherPages(onePage, accumulator) {
        const self = this;

        return new Promise((resolve) => {
            const newAcc = _.concat(accumulator, onePage);

            if (!_.isFunction(onePage.nextPage)) {
                resolve(newAcc); // No more pages
            }
            onePage.nextPage().then((nextPageRes) => { // Get the next page
                self._getOtherPages(nextPageRes, newAcc) // and recursively accumulate its values
                    .then(() => resolve);
            });
        });
    }

    /**
     * Calculate the line number of the last line in a git diffhunk
     * @param {string} diffHunk
     * @return {number} Line number (in original file) of the last line in diffHunk
     */
    static _calculateLinePosition(diffHunk) {
        const regex = /^@@\ -\d+,\d+\ \+(\d+)/;
        const diffLines = _.split(diffHunk, '\n');

        const diffHunkNewStart = regex.exec(_.head(diffLines));

        if (_.isNull(diffHunkNewStart)) {
            return 1;
        }
        const absLineNumber = diffHunkNewStart[1] - 1;

        return _.reduce(_.tail(diffLines), (result, line) => {
            return (_.eq(_.head(line), '-')) ? result : ++result;
        }, absLineNumber);
    }

    /**
     * Extracts relevant information from GitHub comments,
     * and calculates the line number in original file.
     * @param {Object[]} gitHubComments All of the comments received from GutHub.
     * @return {Object[]} List of comments w/ reduced information
     */
    _processComments(gitHubComments) {
        const self = this;

        return _.reduce(_.compact(gitHubComments), (result, comment) => {
            return _.concat(result, {
                reviewer: _.get(comment, 'user.login'),
                line: RepoLinter._calculateLinePosition(_.get(comment, 'diffHunk')),
                message: _.get(comment, 'body'),
                path: _.get(comment, 'path'),
                url: _.get(comment, 'htmlUrl')
            });
        }, []);
    }

    lintRepo(context) {
        const repos = RepoLinter._getAllReposFromContext(context);

        if (_.isEmpty(repos)) {
            return Promise.resolve([]); // Not on GitHub
        }

        return this._getPRReviewComments(repos, context);
    }
}

module.exports = RepoLinter;
