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
import {ConfigSettings} from '../src/lib/config';

const testConfig = {
  auth: {
    'github-token': 'test-github-token',
  },
  organization: 'test-organization',
  'repo-name-regex': 'matches',
};

class ConfigStub {
  _config?: ConfigSettings;
  async init() {
    this._config = testConfig;
  }
  get(field: string) {
    return this._config![field];
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
  async update() {}
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

// tslint:disable-next-line no-any
function getPage(arr: any[], page: number, perPage: number) {
  return arr.slice((page - 1) * perPage, page * perPage);
}

const {GitHub, GitHubRepository} = proxyquire('../src/lib/github', {
  './config': {
    Config: ConfigStub,
  },
  '@octokit/rest': OctokitStub,
});

describe('GitHub', () => {
  it('should authenticate octokit', async () => {
    const spy = sinon.spy(OctokitStub.prototype, 'authenticate');
    const expectedAuthParam = {
      type: 'token',
      token: testConfig['auth']['github-token'],
    };
    const github = new GitHub();
    await github.init();
    assert(spy.calledOnce);
    assert(spy.calledWith(expectedAuthParam));
  });

  it('should get repositories', async () => {
    const testOrg = testConfig['organization'];
    const testType = 'public';
    const repositories = [
      {name: 'matches-1'},
      {name: 'does-not-match-1'},
      {name: '2-matches'},
      {name: '2-does-not-match'},
    ];
    const github = new GitHub();
    await github.init();
    const stub = sinon.stub(github.octokit.repos, 'getForOrg');
    stub.callsFake(({org, type, page, per_page}) => {
      assert.equal(org, testOrg);
      assert.equal(type, testType);
      return Promise.resolve({
        data: getPage(repositories, page || 1, per_page || 1),
      });
    });
    const repos = await github.getRepositories();
    assert.equal(repos.length, 2);
    assert.equal(repos[0].name, 'matches-1');
    assert.equal(repos[0].organization, testConfig['organization']);
    assert.equal(repos[1].name, '2-matches');
    assert.equal(repos[1].organization, testConfig['organization']);
    stub.restore();
  });
});

describe('GitHubRepository', () => {
  const owner = 'test-login';
  const repo = 'test-repo';
  const repositoryObject = {name: repo, owner: {login: owner}};
  const octokit = new OctokitStub();
  const organization = 'test-organization';
  const repository =
      new GitHubRepository(octokit, repositoryObject, organization);

  it('should return repository object', done => {
    assert.deepEqual(repository.getRepository(), repositoryObject);
    done();
  });

  it('should return repository name', done => {
    assert.equal(repository.name, repo);
    done();
  });

  it('should get file', async () => {
    const content = 'test-content';
    const path = 'test-path';
    const stub =
        sinon.stub(octokit.repos, 'getContent').returns(Promise.resolve({
          data: content,
        }));
    const result = await repository.getFile(path);
    assert(stub.calledOnce);
    assert(stub.calledWith({owner, repo, path}));
    assert.equal(result, content);
    stub.restore();
  });

  it('should get file from branch', async () => {
    const ref = 'test-branch';
    const content = 'test-content';
    const path = 'test-path';
    const stub =
        sinon.stub(octokit.repos, 'getContent').returns(Promise.resolve({
          data: content,
        }));
    const result = await repository.getFileFromBranch(ref, path);
    assert(stub.calledOnce);
    assert(stub.calledWith({owner, repo, path, ref}));
    assert.equal(result, content);
    stub.restore();
  });

  it('should list open pull requests', async () => {
    const prs = [{id: 1}, {id: 2}];
    const stub = sinon.stub(octokit.pullRequests, 'getAll');
    const testOwner = owner;
    const testRepo = repo;
    const testState = 'open';
    stub.callsFake(({owner, repo, state, page, per_page}) => {
      assert.equal(owner, testOwner);
      assert.equal(repo, testRepo);
      assert.equal(state, testState);
      return Promise.resolve({data: getPage(prs, page || 1, per_page || 1)});
    });
    const result = await repository.listPullRequests();
    assert.deepEqual(result, prs);
    stub.restore();
  });

  it('should list pull requests', async () => {
    const prs = [{id: 1}, {id: 2}];
    const stub = sinon.stub(octokit.pullRequests, 'getAll');
    const testOwner = owner;
    const testRepo = repo;
    const testState = 'test-state';
    stub.callsFake(({owner, repo, state, page, per_page}) => {
      assert.equal(owner, testOwner);
      assert.equal(repo, testRepo);
      assert.equal(state, testState);
      return Promise.resolve({data: getPage(prs, page || 1, per_page || 1)});
    });
    const result = await repository.listPullRequests(testState);
    assert.deepEqual(result, prs);
    stub.restore();
  });

  it('should get latest commit to master', async () => {
    const commit = {sha: 'test-sha'};
    const ref = 'heads/master';
    const stub = sinon.stub(octokit.repos, 'getShaOfCommitRef')
                     .returns(Promise.resolve({data: commit}));
    const result = await repository.getLatestCommitToMaster();
    assert(stub.calledOnceWith({owner, repo, ref}));
    assert.deepEqual(result, commit);
    stub.restore();
  });

  it('should create branch', async () => {
    const created = {ref: 'test-ref'};
    const branch = 'test-ref';
    const sha = 'test-sha';
    const ref = `refs/heads/${branch}`;
    const stub = sinon.stub(octokit.gitdata, 'createReference')
                     .returns(Promise.resolve({data: created}));
    const result = await repository.createBranch(branch, sha);
    assert(stub.calledOnceWith({owner, repo, ref, sha}));
    assert.deepEqual(result, created);
    stub.restore();
  });

  it('should update branch', async () => {
    const base = 'test-base';
    const head = 'test-head';
    const commit = {sha: 'test-sha'};
    const stub = sinon.stub(octokit.repos, 'merge').returns(Promise.resolve({
      data: commit
    }));
    const result = await repository.updateBranch(base, head);
    assert(stub.calledOnceWith({owner, repo, base, head}));
    assert.deepEqual(result, commit);
    stub.restore();
  });

  it('should create file in branch', async () => {
    const branch = 'test-branch';
    const path = 'test-path';
    const message = 'test-message';
    const content = 'test-content';
    const commit = {sha: 'test-sha'};
    const stub = sinon.stub(octokit.repos, 'createFile')
                     .returns(Promise.resolve({data: commit}));
    const result =
        await repository.createFileInBranch(branch, path, message, content);
    assert(stub.calledOnceWith({owner, repo, path, message, content, branch}));
    assert.deepEqual(result, commit);
    stub.restore();
  });

  it('should update file in branch', async () => {
    const branch = 'test-branch';
    const path = 'test-path';
    const message = 'test-message';
    const content = 'test-content';
    const sha = 'test-sha';
    const commit = {sha: 'test-updated-sha'};
    const stub = sinon.stub(octokit.repos, 'updateFile')
                     .returns(Promise.resolve({data: commit}));
    const result = await repository.updateFileInBranch(
        branch, path, message, content, sha);
    assert(stub.calledOnceWith(
        {owner, repo, path, message, content, sha, branch}));
    assert.deepEqual(result, commit);
    stub.restore();
  });

  it('should create pull request', async () => {
    const branch = 'test-branch';
    const title = 'test-title';
    const body = 'test-body';
    const head = `refs/heads/${branch}`;
    const base = 'refs/heads/master';
    const pr = {id: 1};
    const stub = sinon.stub(octokit.pullRequests, 'create')
                     .returns(Promise.resolve({data: pr}));
    const result = await repository.createPullRequest(branch, title, body);
    assert(stub.calledOnceWith({owner, repo, head, base, title, body}));
    assert.deepEqual(result, pr);
    stub.restore();
  });

  it('should request review', async () => {
    const prNumber = 42;
    const reviewers = ['user1', 'user2'];
    const review = {id: 1};
    const stub = sinon.stub(octokit.pullRequests, 'createReviewRequest')
                     .returns(Promise.resolve({data: review}));
    const result = await repository.requestReview(prNumber, reviewers);
    assert(stub.calledOnceWith({owner, repo, number: prNumber, reviewers}));
    assert.deepEqual(result, review);
    stub.restore();
  });

  it('should approve pull request', async () => {
    const prNumber = 42;
    const pr = {number: prNumber};
    const event = 'APPROVE';
    const review = {id: 1};
    const stub = sinon.stub(octokit.pullRequests, 'createReview')
                     .returns(Promise.resolve({data: review}));
    const result = await repository.approvePullRequest(pr);
    assert(stub.calledOnceWith({owner, repo, number: prNumber, event}));
    assert.deepEqual(result, review);
    stub.restore();
  });

  it('should close pull request', async () => {
    const prNumber = 42;
    const pr = {number: prNumber};
    const state = 'closed';
    const stub = sinon.stub(octokit.pullRequests, 'update')
                     .returns(Promise.resolve({data: pr}));
    const result = await repository.closePullRequest(pr);
    assert(stub.calledOnceWith({owner, repo, number: prNumber, state}));
    assert.deepEqual(result, pr);
    stub.restore();
  });

  it('should merge pull request', async () => {
    const prNumber = 42;
    const pr = {number: prNumber};
    const mergeMethod = 'squash';
    const commit = {sha: 'test-sha'};
    const stub = sinon.stub(octokit.pullRequests, 'merge')
                     .returns(Promise.resolve({data: commit}));
    const result = await repository.mergePullRequest(pr);
    assert(stub.calledOnceWith(
        {owner, repo, number: prNumber, merge_method: mergeMethod}));
    assert.deepEqual(result, commit);
    stub.restore();
  });

  it('should return branch settings', async () => {
    const branch = 'test-branch';
    const response = {name: branch};
    const stub = sinon.stub(octokit.repos, 'getBranch')
                     .returns(Promise.resolve({data: response}));
    const result = await repository.getBranch(branch);
    assert(stub.calledOnceWith({owner, repo, branch}));
    assert.deepEqual(result, response);
    stub.restore();
  });

  it('should return branch protection settings', async () => {
    const branch = 'master';
    const protection = {'required-status-checks': []};
    const stub = sinon.stub(octokit.repos, 'getBranchProtection')
                     .returns(Promise.resolve({data: protection}));
    const result = await repository.getRequiredMasterBranchProtection();
    assert(stub.calledOnceWith({owner, repo, branch}));
    assert.deepEqual(result, protection);
    stub.restore();
  });

  it('should return branch protection status checks', async () => {
    const branch = 'master';
    const statusChecks = {contexts: ['check1', 'check2']};
    const stub =
        sinon.stub(octokit.repos, 'getProtectedBranchRequiredStatusChecks')
            .returns(Promise.resolve({data: statusChecks}));
    const result =
        await repository.getRequiredMasterBranchProtectionStatusChecks();
    assert(stub.calledOnceWith({owner, repo, branch}));
    assert.deepEqual(result, statusChecks);
    stub.restore();
  });

  it('should update branch protection status checks', async () => {
    const branch = 'master';
    const contexts = ['check1', 'check2'];
    const strict = true;
    const updatedResponse = {contexts};
    const stub =
        sinon.stub(octokit.repos, 'updateProtectedBranchRequiredStatusChecks')
            .returns(Promise.resolve({data: updatedResponse}));
    const result =
        await repository.updateRequiredMasterBranchProtectionStatusChecks(
            contexts);
    assert(stub.calledOnceWith({owner, repo, branch, strict, contexts}));
    assert.deepEqual(result, updatedResponse);
    stub.restore();
  });

  it('should add collaborator', async () => {
    const username = 'username';
    const permission = 'permission';
    const stub = sinon.stub(octokit.repos, 'addCollaborator')
                     .returns(Promise.resolve({data: {}}));
    await repository.addCollaborator(username, permission);
    assert(stub.calledOnceWith({owner, repo, username, permission}));
    stub.restore();
  });
});
