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

import * as assert from 'assert';
import {describe, it} from 'mocha';
import * as nock from 'nock';
import {Config} from '../src/lib/config';
import {
  getClient,
  GitHub,
  GitHubRepository,
  Repository,
} from '../src/lib/github';

nock.disableNetConnect();

const testConfig: Config = {
  githubToken: 'test-github-token',
  clonePath: '',
  repos: [{org: 'test-organization', regex: 'matches'}],
};

const testRepo: Repository = {
  name: 'test-repo',
  owner: {login: 'test-organization'},
  default_branch: 'main',
};

const testConfigSearch: Config = {
  githubToken: 'test-github-token',
  clonePath: '',
  repoSearch: 'a-search',
};

const url = 'https://api.github.com';
let repo: GitHubRepository;

describe('GitHub', () => {
  it('should get the list of repositories', async () => {
    const github = new GitHub(testConfig);
    const path =
      '/orgs/test-organization/repos?type=public&page=1&per_page=100';
    const name = 'matches';
    const owner = {login: 'test-organization'};
    const scope = nock(url).get(path).reply(200, [{name, owner}]);
    const repos = await github.getRepositories();
    scope.done();
    assert.strictEqual(repos.length, 1);
    repo = repos[0];
  });

  it('should search for repositories', async () => {
    const github = new GitHub(testConfigSearch);
    const path = '/search/repositories?per_page=100&page=1&q=a-search';
    const full_name = 'test-organization/matches';
    const default_branch = 'main';
    const scope = nock(url)
      .get(path)
      .reply(200, {
        items: [
          {
            full_name,
            default_branch,
          },
        ],
      });
    const repos = await github.getRepositories();
    scope.done();
    assert.strictEqual(repos.length, 1);
    assert.deepStrictEqual(repos[0].repository, {
      owner: {login: 'test-organization'},
      name: 'matches',
      ssh_url: 'git@github.com:test-organization/matches.git',
      default_branch: 'main',
    });
    repo = repos[0];
  });

  it('should include auth headers', async () => {
    const response = {hello: 'world'};
    const path = '/repos/test-organization/matches/contents/index.test';
    const scope = nock(url)
      .get(path, undefined, {
        reqheaders: {authorization: 'token test-github-token'},
      })
      .reply(200, response);
    const file = await repo.getFile('index.test');
    assert.deepStrictEqual(file, response);
    scope.done();
  });

  it('should get a list of repos when using the query syntax', async () => {
    const github = new GitHub({
      githubToken: 'test-github-token',
      clonePath: '',
      repoSearch: 'org:testy language:python',
    });
    const path =
      '/search/repositories?q=org%3Atesty+language%3Apython&per_page=100&page=1';
    const name = 'matches';
    const owner = {login: 'testy'};
    const scope = nock(url)
      .get(path)
      .reply(200, {
        items: [{full_name: `${owner}/${name}`, default_branch: 'main'}],
      });
    const repos = await github.getRepositories();
    scope.done();
    assert.strictEqual(repos.length, 1);
  });
});

describe('GitHubRepository', () => {
  it('should create a branch', async () => {
    const testingClient = getClient(testConfig);
    const repo = new GitHubRepository(
      testingClient,
      testRepo,
      'test-organization'
    );
    const path = '/repos/test-organization/test-repo/git/refs';
    const ref = 'refs/heads/test-branch';
    const sha = '97C0FFA2A1F8E1034924EB33567B5AF77DA18255';
    const scope = nock(url).post(path, {ref, sha}).reply(201, {ref});
    const branch = await repo.createBranch('test-branch', sha);
    scope.done();
    assert.deepEqual(branch, {ref});
  });

  it('should delete a branch', async () => {
    const testingClient = getClient(testConfig);
    const repo = new GitHubRepository(
      testingClient,
      testRepo,
      'test-organization'
    );
    const path =
      '/repos/test-organization/test-repo/git/refs/heads/test-branch';
    const scope = nock(url).delete(path).reply(204);
    await repo.deleteBranch('test-branch');
    scope.done();
  });

  it('should merge two branches', async () => {
    const testingClient = getClient(testConfig);
    const repo = new GitHubRepository(
      testingClient,
      testRepo,
      'test-organization'
    );
    const path = '/repos/test-organization/test-repo/merges';
    const base = 'test-branch-base';
    const head = 'test-branch-head';
    const ref = 'test-branch-base';
    const scope = nock(url).post(path, {base, head}).reply(201, {ref});
    const branch = await repo.updateBranch(base, head);
    scope.done();
    assert.deepEqual(branch, {ref});
  });

  it('should get a branch', async () => {
    const testingClient = getClient(testConfig);
    const repo = new GitHubRepository(
      testingClient,
      testRepo,
      'test-organization'
    );
    const path = '/repos/test-organization/test-repo/branches/test-branch';
    const ref = 'refs/heads/test-branch';
    const scope = nock(url).get(path).reply(200, {ref});
    const branch = await repo.getBranch('test-branch');
    scope.done();
    assert.deepEqual(branch, {ref});
  });
});
