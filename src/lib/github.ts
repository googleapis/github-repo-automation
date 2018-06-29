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

  constructor(options?) {}

  /**
   * Reads configuration file and sets up GitHub authentication.
   * @param {string} configFileName Path to configuration yaml file.
   */
  async init(configFilename?: string) {
    const config = new Config(configFilename);
    await config.init();

    const octokit = new OctoKit();
    octokit.authenticate({
      type: 'token',
      token: config.get('auth')['github-token'],
    });

    this.organization = config.get('organization');
    this.octokit = octokit;
    this.config = config;
  }

  /**
   * List all public repositories of the organization that match the regex
   * filter. Organization name and regex are taken from the configuration file.
   * @returns {GitHubRepository[]} Repositories matching the filter.
   */
  async getRepositories() {
    const org = this.organization;
    const type = 'public';
    const repoNameRegexConfig = this.config.get('repo-name-regex');
    const repoNameRegex = new RegExp(repoNameRegexConfig);

    const repos: GitHubRepository[] = [];
    for (let page = 1;; ++page) {
      const result = await this.octokit.repos.getForOrg({org, type, page});
      const reposPage = result.data;
      if (reposPage.length === 0) {
        break;
      }

      for (const repo of reposPage) {
        if (repo['name'].match(repoNameRegex)) {
          repos.push(
              new GitHubRepository(this.octokit, repo, this.organization));
        }
      }
    }

    return repos;
  }
}

/**
 * Wraps some octokit GitHub API calls for the given repository.
 */
export class GitHubRepository {
  octokit;
  repository;
  organization;
  /**
   * Creates an object to work with the given GitHub repository.
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

  /**
   * Returns the Repository object as returned by GitHub API.
   * @returns {Object} Repository object.
   */
  getRepository() {
    return this.repository;
  }

  /**
   * Returns the name of repository.
   * @returns {string} Name of repository.
   */
  get name() {
    return this.repository['name'];
  }

  /**
   * Returns contents of the file in GitHub repository, master branch.
   * @param {string} path Path to file in repository.
   * @returns {Object} File object, as returned by GitHub API.
   */
  async getFile(path) {
    const owner = this.repository['owner']['login'];
    const repo = this.repository['name'];
    const result = await this.octokit.repos.getContent({owner, repo, path});
    return result.data;
  }

  /**
   * Returns contents of the file from the given branch in GitHub repository.
   * @param {string} branch Branch name.
   * @param {string} path Path to file in repository.
   * @returns {Object} File object, as returned by GitHub API.
   */
  async getFileFromBranch(branch, path) {
    const owner = this.repository['owner']['login'];
    const repo = this.repository['name'];
    const ref = branch;
    const result =
        await this.octokit.repos.getContent({owner, repo, path, ref});
    return result.data;
  }

  /**
   * Lists open pull requests in the repository.
   * @param {string} state Pull request state (open, closed), defaults to open.
   * @returns {Object[]} Pull request objects, as returned by GitHub API.
   */
  async listPullRequests(state?: string) {
    const owner = this.repository['owner']['login'];
    const repo = this.repository['name'];
    state = state || 'open';

    const prs: Array<{}> = [];
    for (let page = 1;; ++page) {
      const result = await this.octokit.pullRequests.getAll({
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

  /**
   * Returns latest commit to master branch of the GitHub repository.
   * @returns {Object} Commit object, as returned by GitHub API.
   */
  async getLatestCommitToMaster() {
    const owner = this.repository['owner']['login'];
    const repo = this.repository['name'];
    const ref = 'heads/master';
    const result =
        await this.octokit.repos.getShaOfCommitRef({owner, repo, ref});
    return result.data;
  }

  /**
   * Creates a new branch in the given GitHub repository.
   * @param {string} branch Name of the new branch.
   * @param {string} sha SHA of the master commit to base the branch on.
   * @returns {Object} Reference object, as returned by GitHub API.
   */
  async createBranch(branch, sha) {
    const owner = this.repository['owner']['login'];
    const repo = this.repository['name'];
    const ref = `refs/heads/${branch}`;

    const result = await this.octokit.gitdata.createReference({
      owner,
      repo,
      ref,
      sha,
    });
    return result.data;
  }

  /**
   * Merges one branch into another.
   * @param {string} base Name of branch to merge info.
   * @param {string} head Name of branch to merge from.
   * @returns {Object} Commit object of the merge commit, as returned by GitHub
   * API.
   */
  async updateBranch(base, head) {
    const owner = this.repository['owner']['login'];
    const repo = this.repository['name'];
    const result = await this.octokit.repos.merge({owner, repo, base, head});
    return result.data;
  }

  /**
   * Creates a new file in the given branch and commits the change to
   * GitHub.
   * @param {string} branch Branch name to update.
   * @param {string} path Path to an existing file in that branch.
   * @param {string} message Commit message.
   * @param {string} content Base64-encoded content of the file.
   * @returns {Object} Commit object, as returned by GitHub API.
   */
  async createFileInBranch(branch, path, message, content) {
    const owner = this.repository['owner']['login'];
    const repo = this.repository['name'];

    const result = await this.octokit.repos.createFile({
      owner,
      repo,
      path,
      message,
      content,
      branch,
    });
    return result.data;
  }

  /**
   * Updates an existing file in the given branch and commits the change to
   * GitHub.
   * @param {string} branch Branch name to update.
   * @param {string} path Path to an existing file in that branch.
   * @param {string} message Commit message.
   * @param {string} content Base64-encoded content of the file.
   * @param {string} sha SHA of the file to be updated.
   * @returns {Object} Commit object, as returned by GitHub API.
   */
  async updateFileInBranch(branch, path, message, content, sha) {
    const owner = this.repository['owner']['login'];
    const repo = this.repository['name'];

    const result = await this.octokit.repos.updateFile({
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

  /**
   * Creates a new pull request from the given branch to master.
   * @param {string} branch Branch name to create a pull request from.
   * @param {string} title Pull request title.
   * @param {string} body Pull request body.
   * @returns {Object} Pull request object, as returned by GitHub API.
   */
  async createPullRequest(branch, title, body) {
    const owner = this.repository['owner']['login'];
    const repo = this.repository['name'];
    const head = `refs/heads/${branch}`;
    const base = 'refs/heads/master';

    const result = await this.octokit.pullRequests.create({
      owner,
      repo,
      head,
      base,
      title,
      body,
    });
    return result.data;
  }

  /**
   * Request a review for the existing pull request.
   * @param {number} prNumber Pull request number (the one visible in its URL).
   * @param {string[]} reviewers Reviewers' GitHub logins for the pull request.
   * @returns Review object, as returned by GitHub API.
   */
  async requestReview(prNumber, reviewers) {
    const owner = this.repository['owner']['login'];
    const repo = this.repository['name'];

    const result = await this.octokit.pullRequests.createReviewRequest({
      owner,
      repo,
      number: prNumber,
      reviewers,
    });
    return result.data;
  }

  /**
   * Approves the given pull request.
   * @param {Object} pr Pull request object, as returned by GitHib API.
   * @returns Review object, as returned by GitHub API.
   */
  async approvePullRequest(pr) {
    const owner = this.repository['owner']['login'];
    const repo = this.repository['name'];
    const prNumber = pr['number'];
    const event = 'APPROVE';

    const result = await this.octokit.pullRequests.createReview({
      owner,
      repo,
      number: prNumber,
      event,
    });
    return result.data;
  }

  /**
   * Closes the given pull request without merging it.
   * @param {Object} pr Pull request object, as returned by GitHub API.
   */
  async closePullRequest(pr) {
    const owner = this.repository['owner']['login'];
    const repo = this.repository['name'];
    const prNumber = pr['number'];
    const state = 'closed';

    const result = await this.octokit.pullRequests.update({
      owner,
      repo,
      number: prNumber,
      state,
    });
    return result.data;
  }

  /**
   * Merges the given pull request.
   * @param {Object} pr Pull request object, as returned by GitHib API.
   * @returns Merge object, as returned by GitHub API.
   */
  async mergePullRequest(pr) {
    const owner = this.repository['owner']['login'];
    const repo = this.repository['name'];
    const prNumber = pr['number'];
    const mergeMethod = 'squash';

    const result = await this.octokit.pullRequests.merge({
      owner,
      repo,
      number: prNumber,
      merge_method: mergeMethod,
    });
    return result.data;
  }

  /**
   * Returns branch settings for the given branch.
   * @param {string} branch Name of the branch.
   * @returns {Object} Branch object, as returned by GitHub API.
   */
  async getBranch(branch) {
    const owner = this.repository['owner']['login'];
    const repo = this.repository['name'];

    const result = await this.octokit.repos.getBranch({owner, repo, branch});
    return result.data;
  }

  /**
   * Returns branch protection settings for master branch.
   * @returns {Object} Branch protection object, as returned by GitHub API.
   */
  async getRequiredMasterBranchProtection() {
    const owner = this.repository['owner']['login'];
    const repo = this.repository['name'];
    const branch = 'master';

    const result = await this.octokit.repos.getBranchProtection({
      owner,
      repo,
      branch,
    });
    return result.data;
  }

  /**
   * Returns branch protection status checks for master branch.
   * @returns {Object} Status checks object, as returned by GitHub API.
   */
  async getRequiredMasterBranchProtectionStatusChecks() {
    const owner = this.repository['owner']['login'];
    const repo = this.repository['name'];
    const branch = 'master';

    const result =
        await this.octokit.repos.getProtectedBranchRequiredStatusChecks(
            {owner, repo, branch});
    return result.data;
  }

  /**
   * Updates branch protection status checks for master branch.
   * @param {string[]} contexts Required status checks.
   * @returns {Object} Status checks object, as returned by GitHub API.
   */
  async updateRequiredMasterBranchProtectionStatusChecks(contexts) {
    const owner = this.repository['owner']['login'];
    const repo = this.repository['name'];
    const branch = 'master';
    const strict = true;

    const result =
        await this.octokit.repos.updateProtectedBranchRequiredStatusChecks(
            {owner, repo, branch, strict, contexts});
    return result.data;
  }

  /**
   * Adds a collaborator to this repository.
   * @param {string} username Username of the new collaborator.
   * @param {string} permission Permission (pull, push, or admin, default:
   * push).
   * @returns {Object} As returned by GitHub API.
   */
  async addCollaborator(username, permission) {
    const owner = this.repository['owner']['login'];
    const repo = this.repository['name'];

    const result = await this.octokit.repos.addCollaborator({
      owner,
      repo,
      username,
      permission,
    });
    return result.data;
  }
}
