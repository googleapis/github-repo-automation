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

import assert from 'assert';
import {describe, it} from 'mocha';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import * as os from 'os';
import * as path from 'path';

import {Config, GetConfig} from '../src/lib/config.js';

import * as tmp from 'tmp-promise';

const clonePath = path.join(os.homedir(), '.repo');

const configObject1: Config = {
  githubToken: 'test-github-token',
  clonePath,
  repos: [{org: 'test-organization', regex: 'test-repo-name-regex'}],
};

const configObject2: Config = {
  githubToken: 'test-github-token-2',
  clonePath,
  repos: [{org: 'test-organization-2', regex: 'test-repo-name-regex-2'}],
};

describe('Config', () => {
  const envCache = process.env.REPO_CONFIG_PATH;
  const cwd = process.cwd();
  let tmpDir;
  // eslint-disable-next-line no-undef
  before(async () => {
    tmpDir = await tmp.dir({unsafeCleanup: true});
    process.chdir(tmpDir.path);
    const configYaml1 = yaml.dump(configObject1);
    const configYaml2 = yaml.dump(configObject2);
    delete process.env['REPO_CONFIG_PATH'];
    fs.writeFileSync('./config.yaml', configYaml1);
    fs.writeFileSync('./config2.yaml', configYaml2);
  });
  // eslint-disable-next-line no-undef
  after(() => {
    process.env.REPO_CONFIG_PATH = envCache;
    process.chdir(cwd);
  });

  it('should read default configuration file', async () => {
    const config = await GetConfig.getConfig();
    assert.deepStrictEqual(config, configObject1);
  });

  it('should return individual values', async () => {
    const config = await GetConfig.getConfig();
    assert.strictEqual(config.githubToken, configObject1.githubToken);
    assert.deepStrictEqual(config.repos, configObject1.repos);
  });

  it('should accept configuration filename', async () => {
    const config = await GetConfig.getConfig('./config2.yaml');
    assert.deepStrictEqual(config, configObject2);
  });

  it('should read environment variable', async () => {
    process.env.REPO_CONFIG_PATH = './config2.yaml';
    const config = await GetConfig.getConfig();
    delete process.env.REPO_CONFIG_PATH;
    assert.deepStrictEqual(config, configObject2);
  });

  it('should fail if configuration file does not exist', done => {
    // This check will be disabled in the new gts
    /* eslint-disable @typescript-eslint/no-empty-function */
    console.error = () => {};
    GetConfig.getConfig('./config3.yaml').catch(err => {
      assert(err instanceof Error);
      done();
    });
  });
});
