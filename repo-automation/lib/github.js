/**
 * @fileoverview Wraps some octokit GitHub API calls.
 */

const fs = require('fs');
const util = require('util');
const readFile = util.promisify(fs.readFile);
const OctoKit = require('@octokit/rest');
const yaml = require('js-yaml');

/** Configuration object. Contains GitHub token, organization and repository
 * filter regex.
 */
class Config {
  /** Constructs a configuration object.
   * @constructor
   * @param {string} configFilename Path to a configuration file. If not given,
   * uses `./config.yaml`.
   */
  constructor(configFilename) {
    this.filename = configFilename || './config.yaml';
  }

  /** Reads the configuration.
   */
  async init() {
    try {
      const yamlContent = await readFile(this.filename);
      this.config = yaml.load(yamlContent);
    } catch (err) {
      console.error(
        `Cannot read configuration file ${
          this.filename
        }. Have you created it? Use config.yaml.default as a sample.`
      );
      throw new Error('Configuration file is not found');
    }
  }

  /** Get option value.
   * @param {string} option Configuration option.
   * @returns {string|Object} Requested value.
   */
  get(option) {
    return this.configData[option];
  }

  /** Get configuration object.
   * @returns {Object} Parsed configuration yaml.
   */
  get config() {
    return this.config;
  }

  /** Assigns configuration object.
   * @param {Object} Configuration object.
   */
  set config(configData) {
    this.configData = configData;
  }
}

/** Wraps some octokit GitHub API calls.
 */
class GitHub {
  /** Reads configuration file and sets up GitHub authentication.
   * @param {string} configFileName Path to configuration yaml file.
   */
  async init(configFilename) {
    let config = new Config(configFilename);
    await config.init();

    let octokit = new OctoKit();
    octokit.authenticate({
      type: 'token',
      token: config.get('auth')['token'],
    });

    this.octokit = octokit;
    this.config = config;
  }

  /** List all public repositories of the organization that match the regex
   * filter. Organization name and regex are taken from the configuration file.
   * @returns {GitHubRepository[]} Repositories matching the filter.
   */
  async getRepositories() {
    let org = this.config.get('organization');
    let type = 'public';
    let repoNameRegexConfig = this.config.get('repo-name-regex') || '.*';
    let repoNameRegex = new RegExp(repoNameRegexConfig);

    let repos = [];
    for (let page = 1; ; ++page) {
      let result = await this.octokit.repos.getForOrg({org, type, page});
      let reposPage = result.data;
      if (reposPage.length === 0) {
        break;
      }

      for (let repo of reposPage) {
        if (repo['name'].match(repoNameRegex)) {
          repos.push(new GitHubRepository(this.octokit, repo));
        }
      }
    }

    return repos;
  }
}

/** Wraps some octokit GitHub API calls for the given repository.
 */
class GitHubRepository {
  /** Creates an object to work with the given GitHub repository.
   * @constructor
   * @param {Object} repository Repository object, as returned by GitHub API.
   */
  constructor(octokit, repository) {
    this.octokit = octokit;
    this.repository = repository;
  }

  /** Returns the Repository object as returned by GitHub API.
   * @returns {Object} Repository object.
   */
  getRepository() {
    return this.repository;
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

  /** Lists open pull requests in the repository.
   * @returns {Object[]} Pull request objects, as returned by GitHub API.
   */
  async listOpenPullRequests() {
    let owner = this.repository['owner']['login'];
    let repo = this.repository['name'];
    let state = 'open';

    let prs = [];
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
}

module.exports = GitHub;
