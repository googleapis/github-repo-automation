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
import {ConfigSettings} from '../src/lib/config';

const testConfig = {
  auth: {
    'circleci-token': 'test-circleci-token',
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

const CircleCI = proxyquire('../src/lib/circleci', {
                   './config': {
                     Config: ConfigStub,
                   }
                 }).CircleCI;

describe('CircleCI', () => {
  const token = testConfig['auth']['circleci-token'];
  const organization = testConfig['organization'];

  it('should initialize and read configuration', async () => {
    const circleci = new CircleCI();
    await circleci.init();
    assert.equal(circleci.circleToken, token);
  });

  it('should get projects', async () => {
    const projects = [
      {reponame: 'matches-1'},
      {reponame: 'does-not-match-1'},
      {reponame: '2-matches'},
      {reponame: '2-does-not-match'},
    ];
    const circleci = new CircleCI();
    await circleci.init();
    nock('https://circleci.com')
        .get('/api/v1.1/projects')
        .query({'circle-token': token})
        .reply(200, projects);
    const result = await circleci.getProjects();
    assert.equal(result.length, 2);
    assert.equal(result[0].reponame, 'matches-1');
    assert.equal(result[1].reponame, '2-matches');
  });

  it('should get builds for github project', async () => {
    const builds = [{build_num: 1}, {build_num: 2}, {build_num: 3}];
    const vcs = 'github';
    const project = 'test-project';
    const circleci = new CircleCI();
    await circleci.init();
    nock('https://circleci.com')
        .get(`/api/v1.1/project/${vcs}/${organization}/${project}`)
        .query({'circle-token': token})
        .reply(200, builds);
    const result = await circleci.getBuildsForProject(project);
    assert.deepEqual(result, builds);
  });

  it('should get builds for project', async () => {
    const builds = [{build_num: 1}, {build_num: 2}, {build_num: 3}];
    const vcs = 'test-vcs';
    const project = 'test-project';
    const circleci = new CircleCI();
    await circleci.init();
    nock('https://circleci.com')
        .get(`/api/v1.1/project/${vcs}/${organization}/${project}`)
        .query({'circle-token': token})
        .reply(200, builds);
    const result = await circleci.getBuildsForProject(project, vcs);
    assert.deepEqual(result, builds);
  });
});
