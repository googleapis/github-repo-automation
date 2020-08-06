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
import {GitHub, GitHubRepository} from '../src/lib/github';

nock.disableNetConnect();

const testConfig: Config = {
  githubToken: 'test-github-token',
  clonePath: '',
  repos: [{org: 'test-organization', regex: 'matches'}],
};

const testConfigBaseBranchOverride: Config = {
  githubToken: 'test-github-token',
  clonePath: '',
  repos: [
    {org: 'test-organization', regex: 'matches', baseBranchOverride: 'main'},
  ],
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

  it('should honor a base branch override', async () => {
    const github = new GitHub(testConfigBaseBranchOverride);
    const path =
      '/orgs/test-organization/repos?type=public&page=1&per_page=100';
    const name = 'matches';
    const owner = {login: 'test-organization'};
    const scope = nock(url).get(path).reply(200, [{name, owner}]);
    const repos = await github.getRepositories();
    scope.done();
    assert.strictEqual(repos.length, 1);
    assert.strictEqual(
      repos[0].baseBranch,
      testConfigBaseBranchOverride.baseBranchOverride
    );
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
        items: [{full_name: `${owner}/${name}`, default_branch: 'master'}],
      });
    const repos = await github.getRepositories();
    scope.done();
    assert.strictEqual(repos.length, 1);
  });
});
