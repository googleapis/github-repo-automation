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
 * @fileoverview Adds nightly builds workflow by copying `test` workflow
 * and tweaking it (removing publish_npm part, change filters).
 */

'use strict';

const updateRepo = require('../lib/update-repo.js');
const child_process = require('child_process');
import * as util from 'util';
const exec = util.promisify(child_process.exec);

/** Runs npm install, removes line `*-lock.js*` from `.gitignore`, and prepares
 * `package-lock.json` and `.gitignore` for check-in.
 * @param {string} Path to a directory where cloned repository is located.
 * @returns {string[]} Returns list of files to commit.
 */
async function commitPackageLockJson(dir) {
  try {
    let cwd = process.cwd();
    process.chdir(dir);
    await exec('npm install --package-lock-only');
    await exec("perl -pi -e 's/\\*-lock.js\\*\\n//' .gitignore");
    process.chdir(cwd);
    return ['package-lock.json', '.gitignore'];
  } catch (err) {
    console.warn('update failed!', err.toString());
    return undefined;
  }
}

/** Main function.
 */
async function main() {
  await updateRepo({
    updateCallback: commitPackageLockJson,
    branch: 'add-package-lock',
    message: 'chore: add package-lock.json',
    comment: "As discussed with the team, let's commit `package-lock.json`.",
    reviewers: ['stephenplusplus', 'callmehiphop', 'googleapis/node-team'],
  });
}

main().catch(err => {
  console.error(err.toString());
});
