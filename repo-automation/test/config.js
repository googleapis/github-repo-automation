/**
 * @fileoverview Description of this file.
 */

'use strict';

const assert = require('assert');
const mockFs = require('mock-fs');
const yaml = require('js-yaml');
const Config = require('../lib/config.js');

const configObject1 = {
  auth: {
    'github-token': 'test-github-token',
    'circleci-token': 'test-circleci-token',
  },
  organization: 'test-organization',
  'repo-name-regex': 'test-repo-name-regex',
};

const configObject2 = {
  auth: {
    'github-token': 'test-github-token-2',
    'circleci-token': 'test-circleci-token-2',
  },
  organization: 'test-organization-2',
  'repo-name-regex': 'test-repo-name-regex-2',
};

describe('Config', () => {
  before(() => {
    let configYaml1 = yaml.dump(configObject1);
    let configYaml2 = yaml.dump(configObject2);
    mockFs({
      './config.yaml': configYaml1,
      './config2.yaml': configYaml2,
    });
  });
  after(() => {
    mockFs.restore();
  });

  it('should read default configuration file', async () => {
    let config = new Config();
    await config.init();
    assert.deepEqual(config.config, configObject1);
  });

  it('should return individual values', async () => {
    let config = new Config();
    await config.init();
    assert.equal(config.get('organization'), configObject1['organization']);
    assert.equal(
      config.get('repo-name-regex'),
      configObject1['repo-name-regex']
    );
    assert.deepEqual(config.get('auth'), configObject1['auth']);
  });

  it('should accept configuration filename', async () => {
    let config = new Config('./config2.yaml');
    await config.init();
    assert.deepEqual(config.config, configObject2);
  });

  it('should fail if configuration file does not exist', done => {
    console.error = () => {};
    let config = new Config('./config3.yaml');
    config.init().catch(err => {
      assert(err instanceof Error);
      delete console.error;
      done();
    });
  });
});
