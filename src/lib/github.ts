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

import axios, {AxiosInstance} from 'axios';
import {Config} from './config';

function getClient(config: Config) {
  return axios.create({
    baseURL: 'https://api.github.com',
    headers: {Authorization: `token ${config.githubToken}`},
  });
}

/**
 * Wraps some octokit GitHub API calls.
 */
export class GitHub {
  protected config: Config;
  protected client: AxiosInstance;

  constructor(config: Config) {
    this.config = config;
    this.client = getClient(config);
  }

  async fetchRepositoriesFromGitHub(): Promise<GitHubRepository[]> {
    if (!this.config.repos) {
      return [];
    }
    const repos = new Array<GitHubRepository>();
    const type = 'public';
    const proms = this.config.repos.map(async repo => {
      const org = repo.org;
      if (repo.name) {
        const res = await this.client.get<Repository>(
          `/repos/${org}/${repo.name}`
        );
        repos.push(new GitHubRepository(this.client, res.data, org));
      } else if (repo.regex) {
        const repoNameRegex = new RegExp(repo.regex);
        for (let page = 1; ; ++page) {
          const result = await this.client.get<Repository[]>(
            `/orgs/${org}/repos`,
            {params: {type, page, per_page: 100}}
          );
          for (const repo of result.data) {
            if (repo.name.match(repoNameRegex)) {
              repos.push(new GitHubRepository(this.client, repo, org));
            }
          }
          if (result.data.length < 100) {
            break;
          }
        }
      } else {
        throw new Error(
          'Each organization in the config must provide either a name or a regex.'
        );
      }
    });
    await Promise.all(proms);
    return repos.filter(repo => !repo.repository.archived);
  }

  async fetchRepositoriesFromJson(): Promise<GitHubRepository[]> {
    if (!this.config.reposList || !this.config.reposList.uri) {
      return [];
    }
    const language = this.config.reposList.language;
    const reposJson = await axios.get(this.config.reposList.uri);
    let reposList: Array<{repo: string; language: string}> =
      reposJson.data.repos;
    if (language) {
      reposList = reposList.filter(repo => repo.language === language);
    }
    const repos = new Array<GitHubRepository>();
    for (const repo of reposList) {
      const [org, name] = repo.repo.split('/');
      if (!org || !name) {
        console.warn(`Warning: repository name ${repo.repo} cannot be parsed.`);
      }
      const repository = {
        owner: {login: org},
        name,
        ssh_url: `git@github.com:${org}/${name}.git`,
      };
      repos.push(new GitHubRepository(this.client, repository, org));
    }
    return repos;
  }

  /**
   * List all public repositories of the organization that match the regex
   * filter. Organization name and regex are taken from the configuration file.
   * @returns {GitHubRepository[]} Repositories matching the filter.
   */
  async getRepositories(): Promise<GitHubRepository[]> {
    const repos = new Array<GitHubRepository>();

    const githubRepos = await this.fetchRepositoriesFromGitHub();
    if (githubRepos.length > 0) {
      console.log(`Loaded ${githubRepos.length} repositories from GitHub.`);
    }

    const jsonRepos = await this.fetchRepositoriesFromJson();
    if (jsonRepos.length > 0) {
      console.log(`Loaded ${jsonRepos.length} repositories from JSON config.`);
    }

    const unique: {[key: string]: GitHubRepository} = {};
    for (const repo of githubRepos.concat(jsonRepos)) {
      const name = `${repo.organization}/${repo.name}`;
      if (!(name in unique)) {
        repos.push(repo);
        unique[name] = repo;
      }
    }

    if (repos.length === 0) {
      throw new Error(
        'No repositories configured. Use config.repos and/or config.reposList.uri.'
      );
    }
    console.log(`Total ${repos.length} unique repositories loaded.`);
    return repos;
  }
}

/**
 * Wraps some octokit GitHub API calls for the given repository.
 */
export class GitHubRepository {
  repository: Repository;
  organization: string;
  protected client: AxiosInstance;

  /**
   * Creates an object to work with the given GitHub repository.
   * @constructor
   * @param {Object} octokit OctoKit instance.
   * @param {Object} repository Repository object, as returned by GitHub API.
   * @param {string} organization Name of GitHub organization.
   */
  constructor(
    client: AxiosInstance,
    repository: Repository,
    organization: string
  ) {
    this.client = client;
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
    return this.repository.name;
  }

  /**
   * Returns contents of the file in GitHub repository, master branch.
   * @param {string} path Path to file in repository.
   * @returns {Object} File object, as returned by GitHub API.
   */
  async getFile(path: string) {
    const owner = this.repository.owner.login;
    const repo = this.repository.name;
    const url = `/repos/${owner}/${repo}/contents/${path}`;
    const res = await this.client.get<File>(url);
    return res.data;
  }

  /**
   * Returns contents of the file from the given branch in GitHub repository.
   * @param {string} branch Branch name.
   * @param {string} path Path to file in repository.
   * @returns {Object} File object, as returned by GitHub API.
   */
  async getFileFromBranch(branch: string, path: string) {
    const owner = this.repository.owner.login;
    const repo = this.repository.name;
    const url = `/repos/${owner}/${repo}/contents/${path}`;
    const res = await this.client.get<File>(url, {params: {ref: branch}});
    return res.data;
  }

  /**
   * Lists open pull requests in the repository.
   * @param {string} state Pull request state (open, closed), defaults to open.
   * @returns {Object[]} Pull request objects, as returned by GitHub API.
   */
  async listPullRequests(state: 'open' | 'closed' | 'all' = 'open') {
    const owner = this.repository.owner.login;
    const repo = this.repository.name;
    const prs: PullRequest[] = [];
    const url = `/repos/${owner}/${repo}/pulls`;
    for (let page = 1; ; ++page) {
      const result = await this.client.get<PullRequest[]>(url, {
        params: {state, page},
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
    const owner = this.repository.owner.login;
    const repo = this.repository.name;
    const ref = 'heads/master';
    const shaUrl = `/repos/${owner}/${repo}/commits/${ref}`;
    const {data: sha} = await this.client.get<string>(shaUrl, {
      headers: {accept: 'application/vnd.github.VERSION.sha'},
    });
    const url = `/repos/${owner}/${repo}/commits/${sha}`;
    const result = await this.client.get(url);
    return result.data;
  }

  /**
   * Creates a new branch in the given GitHub repository.
   * @param {string} branch Name of the new branch.
   * @param {string} sha SHA of the master commit to base the branch on.
   * @returns {Object} Reference object, as returned by GitHub API.
   */
  async createBranch(branch: string, sha: string) {
    const owner = this.repository.owner.login;
    const repo = this.repository.name;
    const ref = `refs/heads/${branch}`;
    const url = `/repos/${owner}/${repo}/git/refs`;
    const result = await this.client.post(url, {ref, sha});
    return result.data;
  }

  /**
   * Deletes the given branch.
   * @param {string} branch Name of the branch.
   */
  async deleteBranch(branch: string) {
    const owner = this.repository.owner.login;
    const repo = this.repository.name;
    const ref = `heads/${branch}`;
    const url = `/repos/${owner}/${repo}/git/refs/${ref}`;
    await this.client.delete(url);
  }

  /**
   * Merges one branch into another.
   * @param {string} base Name of branch to merge info.
   * @param {string} head Name of branch to merge from.
   * @returns {Object} Commit object of the merge commit, as returned by GitHub
   * API.
   */
  async updateBranch(base: string, head: string) {
    const owner = this.repository.owner.login;
    const repo = this.repository.name;
    const url = `/repos/${owner}/${repo}/merges`;
    const result = await this.client.post(url, {base, head});
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
  async createFileInBranch(
    branch: string,
    path: string,
    message: string,
    content: string
  ) {
    const owner = this.repository.owner.login;
    const repo = this.repository.name;
    const url = `/repos/${owner}/${repo}/contents/${path}`;
    const result = await this.client.put(url, {
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
  async updateFileInBranch(
    branch: string,
    path: string,
    message: string,
    content: string,
    sha: string
  ) {
    const owner = this.repository.owner.login;
    const repo = this.repository.name;
    const url = `/repos/${owner}/${repo}/contents/${path}`;
    const result = await this.client.put(url, {message, content, sha, branch});
    return result.data;
  }

  /**
   * Creates a new pull request from the given branch to master.
   * @param {string} branch Branch name to create a pull request from.
   * @param {string} title Pull request title.
   * @param {string} body Pull request body.
   * @returns {Object} Pull request object, as returned by GitHub API.
   */
  async createPullRequest(branch: string, title: string, body: string) {
    const owner = this.repository.owner.login;
    const repo = this.repository.name;
    const head = `refs/heads/${branch}`;
    const base = 'refs/heads/master';
    const url = `/repos/${owner}/${repo}/pulls`;
    const result = await this.client.post(url, {
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
  async requestReview(prNumber: number, reviewers: string[]) {
    const owner = this.repository.owner.login;
    const repo = this.repository.name;
    const url = `/repos/${owner}/${repo}/pulls/${prNumber}/requested_reviewers`;
    const result = await this.client.post(url, {
      reviewers,
    });
    return result.data;
  }

  /**
   * Approves the given pull request.
   * @param {Object} pr Pull request object, as returned by GitHib API.
   * @returns Review object, as returned by GitHub API.
   */
  async approvePullRequest(pr: PullRequest) {
    const owner = this.repository.owner.login;
    const repo = this.repository.name;
    const url = `/repos/${owner}/${repo}/pulls/${pr.number}/reviews`;
    const result = await this.client.post(url, {event: 'APPROVE'});
    return result.data;
  }

  /**
   * Renames the given pull request.
   * @param {Object} pr Pull request object, as returned by GitHib API.
   * @param {string} title New title to give the PR
   * @returns Review object, as returned by GitHub API.
   */
  async renamePullRequest(pr: PullRequest, title: string) {
    const owner = this.repository.owner.login;
    const repo = this.repository.name;
    const url = `/repos/${owner}/${repo}/pulls/${pr.number}`;
    const result = await this.client.patch(url, {title});
    return result.data;
  }

  /**
   * Applies a set of labels to a given pull request.
   * @param {Object} pr Pull request object, as returned by GitHib API.
   * @param {Array<string>} labels Labels to apply to the PR
   * @returns A list of labels that was added to the issue..
   */
  async tagPullRequest(pr: PullRequest, labels: string[]) {
    const owner = this.repository.owner.login;
    const repo = this.repository.name;
    const url = `/repos/${owner}/${repo}/issues/${pr.number}/labels`;
    const result = await this.client.post(url, {labels});
    return result.data;
  }

  /**
   * Closes the given pull request without merging it.
   * @param {Object} pr Pull request object, as returned by GitHub API.
   */
  async closePullRequest(pr: PullRequest) {
    const owner = this.repository.owner.login;
    const repo = this.repository.name;
    const url = `/repos/${owner}/${repo}/pulls/${pr.number}`;
    const result = await this.client.patch(url, {state: 'closed'});
    return result.data;
  }

  /**
   * Merges the given pull request.
   * @param {Object} pr Pull request object, as returned by GitHib API.
   * @returns Merge object, as returned by GitHub API.
   */
  async mergePullRequest(pr: PullRequest) {
    const owner = this.repository.owner.login;
    const repo = this.repository.name;
    const url = `/repos/${owner}/${repo}/pulls/${pr.number}/merge`;
    const result = await this.client.put(url, {merge_method: 'squash'});
    return result.data;
  }

  /**
   * Returns branch settings for the given branch.
   * @param {string} branch Name of the branch.
   * @returns {Object} Branch object, as returned by GitHub API.
   */
  async getBranch(branch: string) {
    const owner = this.repository.owner.login;
    const repo = this.repository.name;
    const url = `/repos/${owner}/${repo}/branches/${branch}`;
    const result = await this.client.get<Branch>(url);
    return result.data;
  }

  /**
   * Returns branch protection settings for master branch.
   * @returns {Object} Branch protection object, as returned by GitHub API.
   */
  async getRequiredMasterBranchProtection() {
    const owner = this.repository.owner.login;
    const repo = this.repository.name;
    const branch = 'master';
    const url = `/repos/${owner}/${repo}/branches/${branch}/protection`;
    const result = await this.client.get(url);
    return result.data;
  }

  /**
   * Returns branch protection status checks for master branch.
   * @returns {Object} Status checks object, as returned by GitHub API.
   */
  async getRequiredMasterBranchProtectionStatusChecks() {
    const owner = this.repository.owner.login;
    const repo = this.repository.name;
    const branch = 'master';
    const url = `/repos/${owner}/${repo}/branches/${branch}/protection/required_status_checks`;
    const result = await this.client.get<StatusCheck[]>(url);
    return result.data;
  }

  /**
   * Updates branch protection status checks for master branch.
   * @param {string[]} contexts Required status checks.
   * @returns {Object} Status checks object, as returned by GitHub API.
   */
  async updateRequiredMasterBranchProtectionStatusChecks(contexts: string[]) {
    const owner = this.repository.owner.login;
    const repo = this.repository.name;
    const branch = 'master';
    const strict = true;
    const url = `/repos/${owner}/${repo}/branches/${branch}/protection/required_status_checks`;
    const result = await this.client.patch(url, {strict, contexts});
    return result.data;
  }

  /**
   * Adds a collaborator to this repository.
   * @param {string} username Username of the new collaborator.
   * @param {string} permission Permission (pull, push, or admin, default:
   * push).
   * @returns {Object} As returned by GitHub API.
   */
  async addCollaborator(
    username: string,
    permission: 'pull' | 'push' | 'admin'
  ) {
    const owner = this.repository.owner.login;
    const repo = this.repository.name;
    const url = `/repos/${owner}/${repo}/collaborators/${username}`;
    const result = await axios.put(url, {permission});
    return result.data;
  }
}

export interface PullRequest {
  number: number;
  title: string;
  html_url: string;
  patch_url: string;
  user: User;
  base: {sha: string};
  head: {ref: string; label: string};
}

export interface Repository {
  name: string;
  owner: User;
  clone_url?: string;
  archived?: boolean;
  ssh_url?: string;
}

export interface User {
  login: string;
}

export interface Branches {
  [index: string]: {
    _latest: string;
  };
}

export interface File {
  type: string;
  encoding: string;
  size: number;
  name: string;
  path: string;
  content: string;
  sha: string;
  url: string;
  git_url: string;
  html_url: string;
  download_url: string;
  _links: {git: string; self: string; html: string};
}
export interface StatusCheck {
  url: string;
  strict: boolean;
  contexts: string[];
  contexts_url: string;
}

export interface Branch {
  protected: boolean;
}
