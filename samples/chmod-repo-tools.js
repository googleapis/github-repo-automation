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
 * @fileoverview Fix CircleCI configuration file in all repositories: remove
 * node7 task from workflows and dependencies.
 */

'use strict';

const yaml = require('js-yaml');
const updateFile = require('../build/src/lib/update-file');

/** Inserts a chmod command after npm install to workaround some bug
 * that happens only in CircleCI.
 * @param {string} circleConfigText CircleCI configuration yaml file.
 * @returns {string} Returns updated config file, or undefined if anything is
 * wrong.
 */
function process(text) {
  const config = yaml.load(text);

  const jobs = config['jobs'];
  for (const name of Object.keys(jobs)) {
    for (const step of jobs[name]['steps']) {
      const run = step['run'];
      if (
        run !== undefined &&
        run['name'].match(/install/i) &&
        !run['command'].match(/repo_tools=/)
      ) {
        run['command'] = run['command'].replace(
          /npm install/,
          'npm install\nrepo_tools="node_modules/@google-cloud/nodejs-repo-tools/bin/tools"\nif ! test -x "$repo_tools"; then\n  chmod +x "$repo_tools"\nfi'
        );
      }
    }
  }

  let newText = yaml.dump(config);
  newText = newText.replace(/ref_0/g, 'workflow_jobs');
  newText = newText.replace(/ref_1/g, 'unit_tests_steps');
  newText = newText.replace(/ref_2/g, 'remove_package_lock');

  if (newText === text) {
    return undefined;
  }
  return newText;
}

/** Main function.
 */
async function main() {
  await updateFile({
    path: '.circleci/config.yml',
    patchFunction: process,
    branch: 'repo-tools-eperm-workaround-2',
    message: 'chore: one more workaround for repo-tools EPERM',
    comment:
      "Sometimes it just happens, only in CircleCI and never reproduced. Here is a proof that this `chmod` fixes the problem: https://circleci.com/gh/googleapis/nodejs-speech/1376 - let's apply this to all our repos and see if it fails or not.\n\nThis PR fixes system tests and sample tests which were missed by previous PR.",
    reviewers: ['stephenplusplus', 'callmehiphop'],
  });
}

main().catch(err => {
  console.error(err.toString());
});
