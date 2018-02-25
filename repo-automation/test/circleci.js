/**
 * @fileoverview Description of this file.
 */

'use strict';

const assert = require('assert');
const proxyquire = require('proxyquire');
const nock = require('nock');

const testConfig = {
  auth: {
    'circleci-token': 'test-circleci-token',
  },
  organization: 'test-organization',
  'repo-name-regex': 'matches',
};

class ConfigStub {
  async init() {
    this._config = testConfig;
  }
  get(field) {
    return this._config[field];
  }
}

const CircleCI = proxyquire('../lib/circleci.js', {
  './config.js': ConfigStub,
});

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
    let scope = nock('https://circleci.com')
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
    let scope = nock('https://circleci.com')
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
    let scope = nock('https://circleci.com')
      .get(`/api/v1.1/project/${vcs}/${organization}/${project}`)
      .query({'circle-token': token})
      .reply(200, builds);
    let result = await circleci.getBuildsForProject(project, vcs);
    assert.deepEqual(result, builds);
  });
});
