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
 * @fileoverview Configuration class.
 */

'use strict';

import * as fs from 'fs';
import * as util from 'util';
const readFile = util.promisify(fs.readFile);
import * as yaml from 'js-yaml';

const cache = new Map<string, Config>();

export async function getConfig(configFilename?: string) {
  let filename: string;
  if (configFilename) {
    filename = configFilename;
  } else if (process.env.REPO_CONFIG_PATH) {
    filename = process.env.REPO_CONFIG_PATH;
  } else {
    filename = './config.yaml';
  }

  if (cache.has(filename)) {
    return cache.get(filename)!;
  }

  try {
    const yamlContent = await readFile(filename, {encoding: 'utf8'});
    const config = yaml.safeLoad(yamlContent) as Config;
    cache.set(filename, config);
    return config;
  } catch (err) {
    console.error(`Cannot read configuration file ${
        filename}. Have you created it? Use config.yaml.default as a sample.`);
    throw new Error('Configuration file is not found');
  }
}

export interface Config {
  auth: {githubToken: string; circleciToken: string;};
  organization: string;
  repoNameRegex: string;
}
