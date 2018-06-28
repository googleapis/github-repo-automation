// Copyright 2018 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Wraps some octokit GitHub API calls.
 */

'use strict';

import OctoKit from '@octokit/rest';
import {Config} from './config';

/**
 * Wraps some octokit GitHub API calls.
 */
export class GitHub {
  organization;
  octokit;
  config;

  constructor(options?) {

  }

  /** Reads configuration file and sets up GitHub authentication.
   * @param {string} configFileName Path to configuration yaml file.
   */
  async init(configFilename?: string) {
    let config = new Config(configFilename);
    await config.init();

    let octokit = new OctoKit();
    octokit.authenticate({
      type: 'token',
      token: config.get('auth')['github-token'],
    });

    this.organization = config.get('organization');
    this.octokit = octokit;
    this.config = config;
  }

  /** List all public repositories of the organization that match the regex
   * filter. Organization name and regex are taken from the configuration file.
   * @returns {GitHubRepository[]} Repositories matching the filter.
   */
  async getRepositories() {
    let org = this.organization;
    let type = 'public';
    let repoNameRegexConfig = this.config.get('repo-name-regex');
    let repoNameRegex = new RegExp(repoNameRegexConfig);

    let repos: GitHubRepository[] = [];
    for (let page = 1; ; ++page) {
      let result = await this.octokit.repos.getForOrg({org, type, page});
      let reposPage = result.data;
      if (reposPage.length === 0) {
        break;
      }

      for (let repo of reposPage) {
        if (repo['name'].match(repoNameRegex)) {
          repos.push(
            new GitHubRepository(this.octokit, repo, this.organization)
          );
        }
      }
    }

    return repos;
  }
}

/** Wraps some octokit GitHub API calls for the given repository.
 */
export class GitHubRepository {
  octokit;
  repository;
  organization;
  /** Creates an object to work with the given GitHub repository.
   * @constructor
   * @param {Object} octokit OctoKit instance.
   * @param {Object} repository Repository object, as returned by GitHub API.
   * @param {string} organization Name of GitHub organization.
   */
  constructor(octokit, repository, organization) {
    this.octokit = octokit;
    this.repository = repository;
    this.organization = organization;
  }

  /** Returns the Repository object as returned by GitHub API.
   * @returns {Object} Repository object.
   */
  getRepository() {
    return this.repository;
  }

  /** Returns the name of repository.
   * @returns {string} Name of repository.
   */
  get name() {
    return this.repository['name'];
  }

  /** Returns contents of the file in GitHub repository, master branch.
   * @param {string} path Path to file in repository.
   * @returns {Object} File object, as returned by GitHub API.
   */
  async getFile(path) {
    let owner = this.repository['owner']['login'];
    let repo = this.repository['name'];
    let result = await this.octokit.repos.getContent({owner, repo, path});
    return result.data;
  }

  /** Returns contents of the file from the given branch in GitHub repository.
   * @param {string} branch Branch name.
   * @param {string} path Path to file in repository.
   * @returns {Object} File object, as returned by GitHub API.
   */
  async getFileFromBranch(branch, path) {
    let owner = this.repository['owner']['login'];
    let repo = this.repository['name'];
    let ref = branch;
    let result = await this.octokit.repos.getContent({owner, repo, path, ref});
    return result.data;
  }

  /** Lists open pull requests in the repository.
   * @param {string} state Pull request state (open, closed), defaults to open.
   * @returns {Object[]} Pull request objects, as returned by GitHub API.
   */
  async listPullRequests(state?: string) {
    let owner = this.repository['owner']['login'];
    let repo = this.repository['name'];
    state = state || 'open';

    let prs: {}[] = [];
    for (let page = 1; ; ++page) {
      let result = await this.octokit.pullRequests.getAll({
        owner,
        repo,
        state,
        page,
      });
      if (result.data.length === 0) {
        break;
      }
      prs.push(...result.data);
    }

    return prs;
  }

  /** Returns latest commit to master branch of the GitHub repository.
   * @returns {Object} Commit object, as returned by GitHub API.
   */
  async getLatestCommitToMaster() {
    let owner = this.repository['owner']['login'];
    let repo = this.repository['name'];
    let ref = 'heads/master';
    let result = await this.octokit.repos.getShaOfCommitRef({owner, repo, ref});
    return result.data;
  }

  /** Creates a new branch in the given GitHub repository.
   * @param {string} branch Name of the new branch.
   * @param {string} sha SHA of the master commit to base the branch on.
   * @returns {Object} Reference object, as returned by GitHub API.
   */
  async createBranch(branch, sha) {
    let owner = this.repository['owner']['login'];
    let repo = this.repository['name'];
    let ref = `refs/heads/${branch}`;

    let result = await this.octokit.gitdata.createReference({
      owner,
      repo,
      ref,
      sha,
    });
    return result.data;
  }

  /** Merges one branch into another.
   * @param {string} base Name of branch to merge info.
   * @param {string} head Name of branch to merge from.
   * @returns {Object} Commit object of the merge commit, as returned by GitHub
   * API.
   */
  async updateBranch(base, head) {
    let owner = this.repository['owner']['login'];
    let repo = this.repository['name'];
    let result = await this.octokit.repos.merge({owner, repo, base, head});
    return result.data;
  }

  /** Creates a new file in the given branch and commits the change to
   * GitHub.
   * @param {string} branch Branch name to update.
   * @param {string} path Path to an existing file in that branch.
   * @param {string} message Commit message.
   * @param {string} content Base64-encoded content of the file.
   * @returns {Object} Commit object, as returned by GitHub API.
   */
  async createFileInBranch(branch, path, message, content) {
    let owner = this.repository['owner']['login'];
    let repo = this.repository['name'];

    let result = await this.octokit.repos.createFile({
      owner,
      repo,
      path,
      message,
      content,
      branch,
    });
    return result.data;
  }

  /** Updates an existing file in the given branch and commits the change to
   * GitHub.
   * @param {string} branch Branch name to update.
   * @param {string} path Path to an existing file in that branch.
   * @param {string} message Commit message.
   * @param {string} content Base64-encoded content of the file.
   * @param {string} sha SHA of the file to be updated.
   * @returns {Object} Commit object, as returned by GitHub API.
   */
  async updateFileInBranch(branch, path, message, content, sha) {
    let owner = this.repository['owner']['login'];
    let repo = this.repository['name'];

    let result = await this.octokit.repos.updateFile({
      owner,
      repo,
      path,
      message,
      content,
      sha,
      branch,
    });
    return result.data;
  }

  /** Creates a new pull request from the given branch to master.
   * @param {string} branch Branch name to create a pull request from.
   * @param {string} title Pull request title.
   * @param {string} body Pull request body.
   * @returns {Object} Pull request object, as returned by GitHub API.
   */
  async createPullRequest(branch, title, body) {
    let owner = this.repository['owner']['login'];
    let repo = this.repository['name'];
    let head = `refs/heads/${branch}`;
    let base = 'refs/heads/master';

    let result = await this.octokit.pullRequests.create({
      owner,
      repo,
      head,
      base,
      title,
      body,
    });
    return result.data;
  }

  /** Request a review for the existing pull request.
   * @param {number} number Pull request number (the one visible in its URL).
   * @param {string[]} reviewers Reviewers' GitHub logins for the pull request.
   * @returns Review object, as returned by GitHub API.
   */
  async requestReview(number, reviewers) {
    let owner = this.repository['owner']['login'];
    let repo = this.repository['name'];

    let result = await this.octokit.pullRequests.createReviewRequest({
      owner,
      repo,
      number,
      reviewers,
    });
    return result.data;
  }

  /** Approves the given pull request.
   * @param {Object} pr Pull request object, as returned by GitHib API.
   * @returns Review object, as returned by GitHub API.
   */
  async approvePullRequest(pr) {
    let owner = this.repository['owner']['login'];
    let repo = this.repository['name'];
    let number = pr['number'];
    let event = 'APPROVE';

    let result = await this.octokit.pullRequests.createReview({
      owner,
      repo,
      number,
      event,
    });
    return result.data;
  }

  /**
   * Closes the given pull request without merging it.
   * @param {Object} pr Pull request object, as returned by GitHub API.
   */
  async closePullRequest(pr) {
    let owner = this.repository['owner']['login'];
    let repo = this.repository['name'];
    let number = pr['number'];
    let state = 'closed';

    let result = await this.octokit.pullRequests.update({
      owner,
      repo,
      number,
      state,
    });
    return result.data;
  }

  /** Merges the given pull request.
   * @param {Object} pr Pull request object, as returned by GitHib API.
   * @returns Merge object, as returned by GitHub API.
   */
  async mergePullRequest(pr) {
    let owner = this.repository['owner']['login'];
    let repo = this.repository['name'];
    let number = pr['number'];
    let merge_method = 'squash';

    let result = await this.octokit.pullRequests.merge({
      owner,
      repo,
      number,
      merge_method,
    });
    return result.data;
  }

  /** Returns branch settings for the given branch.
   * @param {string} branch Name of the branch.
   * @returns {Object} Branch object, as returned by GitHub API.
   */
  async getBranch(branch) {
    let owner = this.repository['owner']['login'];
    let repo = this.repository['name'];

    let result = await this.octokit.repos.getBranch({owner, repo, branch});
    return result.data;
  }

  /** Returns branch protection settings for master branch.
   * @returns {Object} Branch protection object, as returned by GitHub API.
   */
  async getRequiredMasterBranchProtection() {
    let owner = this.repository['owner']['login'];
    let repo = this.repository['name'];
    let branch = 'master';

    let result = await this.octokit.repos.getBranchProtection({
      owner,
      repo,
      branch,
    });
    return result.data;
  }

  /** Returns branch protection status checks for master branch.
   * @returns {Object} Status checks object, as returned by GitHub API.
   */
  async getRequiredMasterBranchProtectionStatusChecks() {
    let owner = this.repository['owner']['login'];
    let repo = this.repository['name'];
    let branch = 'master';

    let result = await this.octokit.repos.getProtectedBranchRequiredStatusChecks(
      {owner, repo, branch}
    );
    return result.data;
  }

  /** Updates branch protection status checks for master branch.
   * @param {string[]} contexts Required status checks.
   * @returns {Object} Status checks object, as returned by GitHub API.
   */
  async updateRequiredMasterBranchProtectionStatusChecks(contexts) {
    let owner = this.repository['owner']['login'];
    let repo = this.repository['name'];
    let branch = 'master';
    let strict = true;

    let result = await this.octokit.repos.updateProtectedBranchRequiredStatusChecks(
      {owner, repo, branch, strict, contexts}
    );
    return result.data;
  }

  /** Adds a collaborator to this repository.
   * @param {string} username Username of the new collaborator.
   * @param {string} permission Permission (pull, push, or admin, default:
   * push).
   * @returns {Object} As returned by GitHub API.
   */
  async addCollaborator(username, permission) {
    let owner = this.repository['owner']['login'];
    let repo = this.repository['name'];

    let result = await this.octokit.repos.addCollaborator({
      owner,
      repo,
      username,
      permission,
    });
    return result.data;
  }
}
