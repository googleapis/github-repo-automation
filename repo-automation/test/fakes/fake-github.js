/**
 * @fileoverview Description of this file.
 */

const crypto = require('crypto');

function hash(string) {
  return crypto
    .createHash('md5')
    .update(string)
    .digest('hex');
}

class FakeGitHubRepository {
  constructor(name) {
    this.name = name;
  }

  reset() {
    this.branches = {
      master: {
        _latest: hash('latest-master-commit'),
      },
    };
    this.prs = {
      _count: 0,
    };
  }

  testSetFile(branch, path, content) {
    if (this.branches[branch] === undefined) {
      this.branches[branch] = {};
    }
    let sha = hash(content);
    let type = 'file';
    this.branches[branch][path] = {content, sha, type};
  }

  async getFile(path) {
    if (this.branches['master'][path] === undefined) {
      return Promise.reject(`No file ${path} in branch master`);
    }
    return Promise.resolve(this.branches['master'][path]);
  }

  async getLatestCommitToMaster() {
    let sha = this.branches['master']['_latest'];
    return Promise.resolve({sha});
  }

  async createBranch(branch, latestSha) {
    if (this.branches[branch] !== undefined) {
      return Promise.reject(`Branch ${branch} already exists`);
    }
    if (this.branches['master']['_latest'] !== latestSha) {
      return Promise.reject(
        `SHA ${latestSha} is not found in branch ${branch}`
      );
    }
    this.branches[branch] = Object.assign({}, this.branches['master']);
    return Promise.resolve({});
  }

  async updateFileInBranch(branch, path, message, content, oldFileSha) {
    if (this.branches[branch] === undefined) {
      return Promise.reject(`Branch ${branch} does not exist`);
    }
    if (this.branches[branch][path] === undefined) {
      return Promise.reject(`File ${path} does not exist in branch ${branch}`);
    }
    let file = this.branches[branch][path];
    if (file['sha'] !== oldFileSha) {
      return Promise.reject(
        `SHA of file ${path} in branch ${branch} is ${
          file['sha']
        } but not ${oldFileSha}`
      );
    }
    let sha = hash(content);
    let newFile = {content, sha, message};
    this.branches[branch][path] = newFile;
    this.branches[branch]['_latest'] = sha;
    return Promise.resolve(newFile);
  }

  async createPullRequest(branch, message, comment) {
    if (this.branches[branch] === undefined) {
      return Promise.reject(`Branch ${branch} does not exist`);
    }
    let number = ++this.prs['_count'];
    let html_url = `http://example.com/pulls/${number}`;
    let pr = {number, branch, message, comment, html_url};
    this.prs[number] = pr;
    return Promise.resolve(pr);
  }

  async requestReview(number, reviewers) {
    if (this.prs[number] === undefined) {
      return Promise.reject(`Pull request ${number} does not exist`);
    }
    this.prs[number]['reviewers'] = reviewers;
    return this.prs[number];
  }

  get name() {
    return this._name;
  }

  set name(n) {
    this._name = n;
  }
}

let repository1 = new FakeGitHubRepository('repo1');
let repository2 = new FakeGitHubRepository('repo2');

class FakeGitHub {
  async init() {
    return Promise.resolve();
  }

  async getRepositories() {
    return [repository1, repository2];
  }
}

module.exports = FakeGitHub;
module.exports.repository1 = repository1;
module.exports.repository2 = repository2;
module.exports.FakeGitHubRepository = FakeGitHubRepository;
