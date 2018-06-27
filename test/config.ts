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
 * @fileoverview Unit tests for lib/config.js.
 */

'use strict';

import assert from 'assert';
import mockFs from 'mock-fs';
import yaml from 'js-yaml';
const Config = require('../src/lib/config.js');

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
