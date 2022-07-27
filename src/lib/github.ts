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

import {Gaxios, GaxiosPromise, GaxiosOptions} from 'gaxios';
import {Config} from './config.js';
import {debuglog} from 'util';
const debug = debuglog('repo');

export function getClient(config: Config) {
  const client = new Gaxios({
    baseURL: 'https://api.github.com',
    headers: {Authorization: `token ${config.githubToken}`},
  });
  // Report rate limit information if NODE_DEBUG=repo set.
  let counter = 0;
  const request = client.request.bind(client);
  client.request = async (opts: GaxiosOptions): GaxiosPromise => {
    const resp = await request(opts);
    const rateLimit = resp.headers['x-ratelimit-limit']
      ? Number(resp.headers['x-ratelimit-limit'])
      : 0;
    const rateLimitRemaining = resp.headers['x-ratelimit-remaining']
      ? Number(resp.headers['x-ratelimit-remaining'])
      : 0;
    const reset = resp.headers['x-ratelimit-reset'];
    if (counter++ % 10 === 0) {
      debug(
        `GitHub rate limit: limit = ${rateLimit} remaining = ${rateLimitRemaining} reset epoch = ${reset}`
      );
    }
    return resp;
  };
  return client;
}

interface SearchReposResponse {
  items: {
    full_name: string;
    default_branch: string;
  }[];
}

/**
 * Wraps some octokit GitHub API calls.
 */
export class GitHub {
  protected config: Config;
  protected client: Gaxios;

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
        const res = await this.client.request<Repository>({
          url: `/repos/${org}/${repo.name}`,
        });
        repos.push(new GitHubRepository(this.client, res.data, org));
      } else if (repo.regex) {
        const repoNameRegex = new RegExp(repo.regex);
        for (let page = 1; ; ++page) {
          const result = await this.client.request<Repository[]>({
            url: `/orgs/${org}/repos`,
            params: {type, page, per_page: 100},
          });
          for (const restRepo of result.data) {
            if (restRepo.name.match(repoNameRegex)) {
              repos.push(new GitHubRepository(this.client, restRepo, org));
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
    if (!this.config.repoSearch) {
      return [];
    }
    const repoList = [];
    for (let page = 1; ; ++page) {
      const res = await this.client.request<SearchReposResponse>({
        url: '/search/repositories',
        params: {
          per_page: 100,
          page,
          q: this.config.repoSearch,
        },
      });
      repoList.push(
        ...res.data.items.map(r => {
          return {name: r.full_name, branch: r.default_branch};
        })
      );
      if (res.data.items.length < 100) {
        break;
      }
    }

    const repos = new Array<GitHubRepository>();
    for (const repo of repoList) {
      const [org, name] = repo.name.split('/');
      if (!org || !name) {
        console.warn(`Warning: repository name ${repo} cannot be parsed.`);
      }
      const repository = {
        owner: {login: org},
        name,
        ssh_url: `git@github.com:${org}/${name}.git`,
        default_branch: repo.branch,
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
        'No repositories configured. Use config.repos and/or config.repoSearch.'
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
  baseBranch: string;
  protected client: Gaxios;

  /**
   * Creates an object to work with the given GitHub repository.
   * @constructor
   * @param {Object} octokit OctoKit instance.
   * @param {Object} repository Repository object, as returned by GitHub API.
   * @param {string} organization Name of GitHub organization.
   */
  constructor(client: Gaxios, repository: Repository, organization: string) {
    this.client = client;
    this.repository = repository;
    this.organization = organization;
    this.baseBranch = this.repository.default_branch;
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
   * Returns contents of the file in GitHub repository
   * @param {string} path Path to file in repository.
   * @returns {Object} File object, as returned by GitHub API.
   */
  async getFile(path: string) {
    const owner = this.repository.owner.login;
    const repo = this.repository.name;
    const url = `/repos/${owner}/${repo}/contents/${path}`;
    const res = await this.client.request<File>({url});
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
    const res = await this.client.request<File>({url, params: {ref: branch}});
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
      const result = await this.client.request<PullRequest[]>({
        url,
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
   * List issues on a repository.
   * @param {string} state Issue state (open, closed), defaults to open.
   * @returns {Object[]} Issue objects, as returned by GitHub API.
   */
  async listIssues(state: 'open' | 'closed' | 'all' = 'open') {
    const owner = this.repository.owner.login;
    const repo = this.repository.name;
    const prs: Issue[] = [];
    const url = `/repos/${owner}/${repo}/issues`;
    for (let page = 1; ; ++page) {
      const result = await this.client.request<Issue[]>({
        url,
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
   * Returns latest commit to the default branch of the GitHub repository.
   * @param {string} [customBranch] Specify a branch to use other than the default base branch
   * @returns {Object} Commit object, as returned by GitHub API.
   */
  async getLatestCommitToBaseBranch(customBranch?: string) {
    const owner = this.repository.owner.login;
    const repo = this.repository.name;
    const ref = `heads/${customBranch || this.baseBranch}`;
    const shaUrl = `/repos/${owner}/${repo}/commits/${ref}`;
    const {data: sha} = await this.client.request<string>({
      url: shaUrl,
      headers: {accept: 'application/vnd.github.VERSION.sha'},
    });
    const url = `/repos/${owner}/${repo}/commits/${sha}`;
    const result = await this.client.request({url});
    return result.data;
  }

  /**
   * Creates a new branch in the given GitHub repository.
   * @param {string} branch Name of the new branch.
   * @param {string} sha SHA of the main commit to base the branch on.
   * @returns {Object} Reference object, as returned by GitHub API.
   */
  async createBranch(branch: string, sha: string) {
    const owner = this.repository.owner.login;
    const repo = this.repository.name;
    const ref = `refs/heads/${branch}`;
    const url = `/repos/${owner}/${repo}/git/refs`;
    const result = await this.client.request({
      url,
      method: 'POST',
      data: {ref, sha},
    });
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
    await this.client.request({
      url,
      method: 'DELETE',
    });
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
    const result = await this.client.request({
      url,
      method: 'POST',
      data: {base, head},
    });
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
    const result = await this.client.request({
      url,
      method: 'PUT',
      data: {
        message,
        content,
        branch,
      },
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
    const result = await this.client.request({
      url,
      method: 'PUT',
      data: {message, content, sha, branch},
    });
    return result.data;
  }

  /**
   * Creates a new pull request from the given branch to the base branch.
   * @param {string} branch Branch name to create a pull request from.
   * @param {string} title Pull request title.
   * @param {string} body Pull request body.
   * @returns {Object} Pull request object, as returned by GitHub API.
   */
  async createPullRequest(branch: string, title: string, body: string) {
    const owner = this.repository.owner.login;
    const repo = this.repository.name;
    const head = branch;
    const base = this.baseBranch;
    const url = `/repos/${owner}/${repo}/pulls`;
    const result = await this.client.request({
      url,
      method: 'POST',
      data: {
        head,
        base,
        title,
        body,
      },
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
    const result = await this.client.request({
      url,
      method: 'POST',
      data: {
        reviewers,
      },
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
    const result = await this.client.request({
      url,
      method: 'POST',
      data: {event: 'APPROVE'},
    });
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
    const result = await this.client.request({
      url,
      method: 'PATCH',
      data: {title},
    });
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
    const result = await this.client.request({
      url,
      method: 'POST',
      data: {labels},
    });
    return result.data;
  }

  /**
   * Removes label with a given name to a given pull request.
   * @param {Object} pr Pull request object, as returned by GitHib API.
   * @param {Array<string>} labels Labels to apply to the PR
   * @returns A list of labels that was added to the issue..
   */
  async unTagPullRequest(pr: PullRequest, name: string) {
    const owner = this.repository.owner.login;
    const repo = this.repository.name;
    const url = `/repos/${owner}/${repo}/issues/${pr.number}/labels/${name}`;
    const result = await this.client.request({
      url,
      method: 'DELETE',
      data: {name},
    });
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
    const result = await this.client.request({
      url,
      method: 'PATCH',
      data: {state: 'closed'},
    });
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
    const title = pr.title;
    const url = `/repos/${owner}/${repo}/pulls/${pr.number}/merge`;
    const result = await this.client.request({
      url,
      method: 'PUT',
      data: {
        merge_method: 'squash',
        commit_title: title,
      },
    });
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
    const result = await this.client.request<Branch>({url});
    return result.data;
  }

  /**
   * Returns branch protection settings for the base branch.
   * @returns {Object} Branch protection object, as returned by GitHub API.
   */
  async getRequiredBaseBranchProtection() {
    const owner = this.repository.owner.login;
    const repo = this.repository.name;
    const branch = this.baseBranch;
    const url = `/repos/${owner}/${repo}/branches/${branch}/protection`;
    const result = await this.client.request({url});
    return result.data;
  }

  /**
   * Returns branch protection status checks for the base branch.
   * @returns {Object} Status checks object, as returned by GitHub API.
   */
  async getRequiredBaseBranchProtectionStatusChecks() {
    const owner = this.repository.owner.login;
    const repo = this.repository.name;
    const branch = this.baseBranch;
    const url = `/repos/${owner}/${repo}/branches/${branch}/protection/required_status_checks`;
    const result = await this.client.request<StatusCheck[]>({url});
    return result.data;
  }

  /**
   * Updates branch protection status checks for the base branch.
   * @param {string[]} contexts Required status checks.
   * @returns {Object} Status checks object, as returned by GitHub API.
   */
  async updateRequiredBaseBranchProtectionStatusChecks(contexts: string[]) {
    const owner = this.repository.owner.login;
    const repo = this.repository.name;
    const branch = this.baseBranch;
    const strict = true;
    const url = `/repos/${owner}/${repo}/branches/${branch}/protection/required_status_checks`;
    const result = await this.client.request({
      url,
      method: 'PATCH',
      data: {strict, contexts},
    });
    return result.data;
  }

  /**
   * Updates admin enforcement for branch protection status checks for the base branch.
   * @param {boolean} enforce Whether to enforce branch protection for admins.
   * @returns {Object} HTTP response
   */
  async updateEnforceAdmin(enforce: boolean) {
    const owner = this.repository.owner.login;
    const repo = this.repository.name;
    const branch = this.baseBranch;
    const url = `/repos/${owner}/${repo}/branches/${branch}/protection/enforce_admins`;
    const method = enforce ? 'POST' : 'DELETE';
    const result = await this.client.request({
      url,
      method,
    });
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
    const result = await this.client.request({
      url,
      method: 'PUT',
      data: {permission},
    });
    return result.data;
  }
}

export interface PullRequest extends Issue {
  patch_url: string;
  base: {sha: string};
  head: {ref: string; label: string; repo: Repository};
  labels: Array<{
    name: string;
  }>;
}

export interface Issue {
  number: number;
  title: string;
  body: string;
  html_url: string;
  user: User;
}

export interface Repository {
  name: string;
  owner: User;
  default_branch: string;
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
