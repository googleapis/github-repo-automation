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
 * @fileoverview Unit tests for lib/github.js.
 */

'use strict';

import assert from 'assert';
import proxyquire from 'proxyquire';
import sinon from 'sinon';

const testConfig = {
  auth: {
    'github-token': 'test-github-token',
  },
  organization: 'test-organization',
  'repo-name-regex': 'matches',
};

class ConfigStub {
  _config;
  async init() {
    this._config = testConfig;
  }
  get(field) {
    return this._config[field];
  }
}

class OctokitReposStub {
  async getForOrg() {}
  async getContent() {}
  async getShaOfCommitRef() {}
  async merge() {}
  async createFile() {}
  async updateFile() {}
  async getBranch() {}
  async getBranchProtection() {}
  async getProtectedBranchRequiredStatusChecks() {}
  async updateProtectedBranchRequiredStatusChecks() {}
  async addCollaborator() {}
}

class OctokitPullRequestsStub {
  async getAll() {}
  async create() {}
  async createReviewRequest() {}
  async createReview() {}
  async merge() {}
}

class OctokitGitdataStub {
  async createReference() {}
}

class OctokitStub {
  repos: OctokitReposStub;
  pullRequests: OctokitPullRequestsStub;
  gitdata: OctokitGitdataStub;
  constructor() {
    this.repos = new OctokitReposStub();
    this.pullRequests = new OctokitPullRequestsStub();
    this.gitdata = new OctokitGitdataStub();
  }
  authenticate() {}
}

function getPage(arr, page, perPage) {
  return arr.slice((page - 1) * perPage, page * perPage);
}

const GitHub = proxyquire('../src/lib/github.js', {
  './config.js': ConfigStub,
  '@octokit/rest': OctokitStub,
});

describe('GitHub', () => {
  it('should authenticate octokit', async () => {
    let spy = sinon.spy(OctokitStub.prototype, 'authenticate');
    let expectedAuthParam = {
      type: 'token',
      token: testConfig['auth']['github-token'],
    };
    let github = new GitHub();
    await github.init();
    assert(spy.calledOnce);
    assert(spy.calledWith(expectedAuthParam));
  });

  it('should get repositories', async () => {
    let testOrg = testConfig['organization'];
    let testType = 'public';
    let repositories = [
      {name: 'matches-1'},
      {name: 'does-not-match-1'},
      {name: '2-matches'},
      {name: '2-does-not-match'},
    ];
    let github = new GitHub();
    await github.init();
    let stub = sinon.stub(github.octokit.repos, 'getForOrg');
    stub.callsFake(({org, type, page, per_page}) => {
      assert.equal(org, testOrg);
      assert.equal(type, testType);
      return Promise.resolve({
        data: getPage(repositories, page || 1, per_page || 1),
      });
    });
    let repos = await github.getRepositories();
    assert.equal(repos.length, 2);
    assert.equal(repos[0].name, 'matches-1');
    assert.equal(repos[0].organization, testConfig['organization']);
    assert.equal(repos[1].name, '2-matches');
    assert.equal(repos[1].organization, testConfig['organization']);
    stub.restore();
  });
});

describe('GitHubRepository', () => {
  let owner = 'test-login';
  let repo = 'test-repo';
  let repositoryObject = {name: repo, owner: {login: owner}};
  let octokit = new OctokitStub();
  let organization = 'test-organization';
  let repository = new GitHub.GitHubRepository(
    octokit,
    repositoryObject,
    organization
  );

  it('should return repository object', done => {
    assert.deepEqual(repository.getRepository(), repositoryObject);
    done();
  });

  it('should return repository name', done => {
    assert.equal(repository.name, repo);
    done();
  });

  it('should get file', async () => {
    let content = 'test-content';
    let path = 'test-path';
    let stub = sinon.stub(octokit.repos, 'getContent').returns(
      Promise.resolve({
        data: content,
      })
    );
    let result = await repository.getFile(path);
    assert(stub.calledOnce);
    assert(stub.calledWith({owner, repo, path}));
    assert.equal(result, content);
    stub.restore();
  });

  it('should get file from branch', async () => {
    let ref = 'test-branch';
    let content = 'test-content';
    let path = 'test-path';
    let stub = sinon.stub(octokit.repos, 'getContent').returns(
      Promise.resolve({
        data: content,
      })
    );
    let result = await repository.getFileFromBranch(ref, path);
    assert(stub.calledOnce);
    assert(stub.calledWith({owner, repo, path, ref}));
    assert.equal(result, content);
    stub.restore();
  });

  it('should list open pull requests', async () => {
    let prs = [{id: 1}, {id: 2}];
    let stub = sinon.stub(octokit.pullRequests, 'getAll');
    let testOwner = owner;
    let testRepo = repo;
    let testState = 'open';
    stub.callsFake(({owner, repo, state, page, per_page}) => {
      assert.equal(owner, testOwner);
      assert.equal(repo, testRepo);
      assert.equal(state, testState);
      return Promise.resolve({data: getPage(prs, page || 1, per_page || 1)});
    });
    let result = await repository.listPullRequests();
    assert.deepEqual(result, prs);
    stub.restore();
  });

  it('should list pull requests', async () => {
    let prs = [{id: 1}, {id: 2}];
    let stub = sinon.stub(octokit.pullRequests, 'getAll');
    let testOwner = owner;
    let testRepo = repo;
    let testState = 'test-state';
    stub.callsFake(({owner, repo, state, page, per_page}) => {
      assert.equal(owner, testOwner);
      assert.equal(repo, testRepo);
      assert.equal(state, testState);
      return Promise.resolve({data: getPage(prs, page || 1, per_page || 1)});
    });
    let result = await repository.listPullRequests(testState);
    assert.deepEqual(result, prs);
    stub.restore();
  });

  it('should get latest commit to master', async () => {
    let commit = {sha: 'test-sha'};
    let ref = 'heads/master';
    let stub = sinon
      .stub(octokit.repos, 'getShaOfCommitRef')
      .returns(Promise.resolve({data: commit}));
    let result = await repository.getLatestCommitToMaster();
    assert(stub.calledOnceWith({owner, repo, ref}));
    assert.deepEqual(result, commit);
    stub.restore();
  });

  it('should create branch', async () => {
    let created = {ref: 'test-ref'};
    let branch = 'test-ref';
    let sha = 'test-sha';
    let ref = `refs/heads/${branch}`;
    let stub = sinon
      .stub(octokit.gitdata, 'createReference')
      .returns(Promise.resolve({data: created}));
    let result = await repository.createBranch(branch, sha);
    assert(stub.calledOnceWith({owner, repo, ref, sha}));
    assert.deepEqual(result, created);
    stub.restore();
  });

  it('should update branch', async () => {
    let base = 'test-base';
    let head = 'test-head';
    let commit = {sha: 'test-sha'};
    let stub = sinon
      .stub(octokit.repos, 'merge')
      .returns(Promise.resolve({data: commit}));
    let result = await repository.updateBranch(base, head);
    assert(stub.calledOnceWith({owner, repo, base, head}));
    assert.deepEqual(result, commit);
    stub.restore();
  });

  it('should create file in branch', async () => {
    let branch = 'test-branch';
    let path = 'test-path';
    let message = 'test-message';
    let content = 'test-content';
    let commit = {sha: 'test-sha'};
    let stub = sinon
      .stub(octokit.repos, 'createFile')
      .returns(Promise.resolve({data: commit}));
    let result = await repository.createFileInBranch(
      branch,
      path,
      message,
      content
    );
    assert(stub.calledOnceWith({owner, repo, path, message, content, branch}));
    assert.deepEqual(result, commit);
    stub.restore();
  });

  it('should update file in branch', async () => {
    let branch = 'test-branch';
    let path = 'test-path';
    let message = 'test-message';
    let content = 'test-content';
    let sha = 'test-sha';
    let commit = {sha: 'test-updated-sha'};
    let stub = sinon
      .stub(octokit.repos, 'updateFile')
      .returns(Promise.resolve({data: commit}));
    let result = await repository.updateFileInBranch(
      branch,
      path,
      message,
      content,
      sha
    );
    assert(
      stub.calledOnceWith({owner, repo, path, message, content, sha, branch})
    );
    assert.deepEqual(result, commit);
    stub.restore();
  });

  it('should create pull request', async () => {
    let branch = 'test-branch';
    let title = 'test-title';
    let body = 'test-body';
    let head = `refs/heads/${branch}`;
    let base = 'refs/heads/master';
    let pr = {id: 1};
    let stub = sinon
      .stub(octokit.pullRequests, 'create')
      .returns(Promise.resolve({data: pr}));
    let result = await repository.createPullRequest(branch, title, body);
    assert(stub.calledOnceWith({owner, repo, head, base, title, body}));
    assert.deepEqual(result, pr);
    stub.restore();
  });

  it('should request review', async () => {
    let number = 42;
    let reviewers = ['user1', 'user2'];
    let review = {id: 1};
    let stub = sinon
      .stub(octokit.pullRequests, 'createReviewRequest')
      .returns(Promise.resolve({data: review}));
    let result = await repository.requestReview(number, reviewers);
    assert(stub.calledOnceWith({owner, repo, number, reviewers}));
    assert.deepEqual(result, review);
    stub.restore();
  });

  it('should approve pull request', async () => {
    let number = 42;
    let pr = {number};
    let event = 'APPROVE';
    let review = {id: 1};
    let stub = sinon
      .stub(octokit.pullRequests, 'createReview')
      .returns(Promise.resolve({data: review}));
    let result = await repository.approvePullRequest(pr);
    assert(stub.calledOnceWith({owner, repo, number, event}));
    assert.deepEqual(result, review);
    stub.restore();
  });

  it('should merge pull request', async () => {
    let number = 42;
    let pr = {number};
    let merge_method = 'squash';
    let commit = {sha: 'test-sha'};
    let stub = sinon
      .stub(octokit.pullRequests, 'merge')
      .returns(Promise.resolve({data: commit}));
    let result = await repository.mergePullRequest(pr);
    assert(stub.calledOnceWith({owner, repo, number, merge_method}));
    assert.deepEqual(result, commit);
    stub.restore();
  });

  it('should return branch settings', async () => {
    let branch = 'test-branch';
    let response = {name: branch};
    let stub = sinon
      .stub(octokit.repos, 'getBranch')
      .returns(Promise.resolve({data: response}));
    let result = await repository.getBranch(branch);
    assert(stub.calledOnceWith({owner, repo, branch}));
    assert.deepEqual(result, response);
    stub.restore();
  });

  it('should return branch protection settings', async () => {
    let branch = 'master';
    let protection = {'required-status-checks': []};
    let stub = sinon
      .stub(octokit.repos, 'getBranchProtection')
      .returns(Promise.resolve({data: protection}));
    let result = await repository.getRequiredMasterBranchProtection();
    assert(stub.calledOnceWith({owner, repo, branch}));
    assert.deepEqual(result, protection);
    stub.restore();
  });

  it('should return branch protection status checks', async () => {
    let branch = 'master';
    let statusChecks = {contexts: ['check1', 'check2']};
    let stub = sinon
      .stub(octokit.repos, 'getProtectedBranchRequiredStatusChecks')
      .returns(Promise.resolve({data: statusChecks}));
    let result = await repository.getRequiredMasterBranchProtectionStatusChecks();
    assert(stub.calledOnceWith({owner, repo, branch}));
    assert.deepEqual(result, statusChecks);
    stub.restore();
  });

  it('should update branch protection status checks', async () => {
    let branch = 'master';
    let contexts = ['check1', 'check2'];
    let strict = true;
    let updatedResponse = {contexts};
    let stub = sinon
      .stub(octokit.repos, 'updateProtectedBranchRequiredStatusChecks')
      .returns(Promise.resolve({data: updatedResponse}));
    let result = await repository.updateRequiredMasterBranchProtectionStatusChecks(
      contexts
    );
    assert(stub.calledOnceWith({owner, repo, branch, strict, contexts}));
    assert.deepEqual(result, updatedResponse);
    stub.restore();
  });

  it('should add collaborator', async () => {
    let username = 'username';
    let permission = 'permission';
    let stub = sinon
      .stub(octokit.repos, 'addCollaborator')
      .returns(Promise.resolve({data: {}}));
    await repository.addCollaborator(username, permission);
    assert(stub.calledOnceWith({owner, repo, username, permission}));
    stub.restore();
  });
});
