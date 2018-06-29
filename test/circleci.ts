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
 * @fileoverview Unit tests for lib/circleci.js.
 */

'use strict';

import assert from 'assert';
import proxyquire from 'proxyquire';
import nock from 'nock';

const testConfig = {
  auth: {
    'circleci-token': 'test-circleci-token',
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

const CircleCI = proxyquire('../src/lib/circleci', {
  './config': {
    Config: ConfigStub,
  }
}).CircleCI;

describe('CircleCI', () => {
  let token = testConfig['auth']['circleci-token'];
  let organization = testConfig['organization'];

  it('should initialize and read configuration', async () => {
    let circleci = new CircleCI();
    await circleci.init();
    assert.equal(circleci.circleToken, token);
  });

  it('should get projects', async () => {
    let projects = [
      {reponame: 'matches-1'},
      {reponame: 'does-not-match-1'},
      {reponame: '2-matches'},
      {reponame: '2-does-not-match'},
    ];
    let circleci = new CircleCI();
    await circleci.init();
    nock('https://circleci.com')
      .get('/api/v1.1/projects')
      .query({'circle-token': token})
      .reply(200, projects);
    let result = await circleci.getProjects();
    assert.equal(result.length, 2);
    assert.equal(result[0].reponame, 'matches-1');
    assert.equal(result[1].reponame, '2-matches');
  });

  it('should get builds for github project', async () => {
    let builds = [{build_num: 1}, {build_num: 2}, {build_num: 3}];
    let vcs = 'github';
    let project = 'test-project';
    let circleci = new CircleCI();
    await circleci.init();
    nock('https://circleci.com')
      .get(`/api/v1.1/project/${vcs}/${organization}/${project}`)
      .query({'circle-token': token})
      .reply(200, builds);
    let result = await circleci.getBuildsForProject(project);
    assert.deepEqual(result, builds);
  });

  it('should get builds for project', async () => {
    let builds = [{build_num: 1}, {build_num: 2}, {build_num: 3}];
    let vcs = 'test-vcs';
    let project = 'test-project';
    let circleci = new CircleCI();
    await circleci.init();
    nock('https://circleci.com')
      .get(`/api/v1.1/project/${vcs}/${organization}/${project}`)
      .query({'circle-token': token})
      .reply(200, builds);
    let result = await circleci.getBuildsForProject(project, vcs);
    assert.deepEqual(result, builds);
  });
});
