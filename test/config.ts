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
import fs from 'fs';
import yaml from 'js-yaml';
import {Config} from '../src/lib/config';
const tmp = require('tmp-promise');

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
  const envCache = process.env.REPO_CONFIG_PATH;
  const cwd = process.cwd();
  let tmpDir;
  before(async () => {
    tmpDir = await tmp.dir({unsafeCleanup: true});
    process.chdir(tmpDir.path);
    const configYaml1 = yaml.dump(configObject1);
    const configYaml2 = yaml.dump(configObject2);
    delete process.env['REPO_CONFIG_PATH'];
    fs.writeFileSync('./config.yaml', configYaml1);
    fs.writeFileSync('./config2.yaml', configYaml2);
  });
  after(() => {
    process.env.REPO_CONFIG_PATH = envCache;
    process.chdir(cwd);
  });

  it('should read default configuration file', async () => {
    const config = new Config();
    await config.init();
    assert.deepEqual(config.config, configObject1);
  });

  it('should return individual values', async () => {
    const config = new Config();
    await config.init();
    assert.equal(config.get('organization'), configObject1['organization']);
    assert.equal(
        config.get('repo-name-regex'), configObject1['repo-name-regex']);
    assert.deepEqual(config.get('auth'), configObject1['auth']);
  });

  it('should accept configuration filename', async () => {
    const config = new Config('./config2.yaml');
    await config.init();
    assert.deepEqual(config.config, configObject2);
  });

  it('should read environment variable', async () => {
    process.env.REPO_CONFIG_PATH = './config2.yaml';
    const config = new Config();
    await config.init();
    delete process.env.REPO_CONFIG_PATH;
    assert.deepEqual(config.config, configObject2);
  });

  it('should fail if configuration file does not exist', done => {
    console.error = () => {};
    const config = new Config('./config3.yaml');
    config.init().catch(err => {
      assert(err instanceof Error);
      delete console.error;
      done();
    });
  });
});
