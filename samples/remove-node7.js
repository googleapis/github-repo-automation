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
const updateFile = require('../build/src/lib/update-file.js');

/** A helper function to remove a job from CirleCI job array.
 * @param {Object[]} jobArray Jobs, as written in CircleCI config yaml.
 * @param {string} jobNameToRemove Job to remove, e.g. node7.
 * @returns {boolean} true if the change was successful, false otherwise.
 */
function removeJobFromArray(jobArray, jobNameToRemove) {
  let idToDelete;
  for (const index in jobArray) {
    const job = jobArray[index];
    const keys = Object.keys(job);
    const name = keys[0];
    if (name === jobNameToRemove) {
      if (idToDelete === undefined) {
        idToDelete = index;
      } else {
        console.warn(
          `  two jobs ${jobNameToRemove} found in jobs array, canceling change`
        );
        return false;
      }
    }
  }

  if (idToDelete === undefined) {
    console.warn(
      `  job ${jobNameToRemove} was not found in jobs array, canceling change`
    );
    return false;
  }
  jobArray.splice(idToDelete, 1);
  return true;
}

/** Remove all references to the given job from CircleCI config file.
 * @param {string} circleConfigText CircleCI configuration yaml file.
 * @param {string} jobNameToRemove Job name, e.g. node7.
 * @returns {string} Returns updated config file, or undefined if anything is
 * wrong.
 */
function removeJobFromCircleConfig(circleConfigText, jobNameToRemove) {
  const circleConfigYaml = yaml.load(circleConfigText);

  if (
    !removeJobFromArray(
      circleConfigYaml['workflows']['tests']['jobs'],
      jobNameToRemove
    )
  ) {
    console.warn(
      `  cannot remove job ${jobNameToRemove} from workflow 'tests'`
    );
    return;
  }

  delete circleConfigYaml['jobs'][jobNameToRemove];

  for (const job of circleConfigYaml['workflows']['tests']['jobs']) {
    const keys = Object.keys(job);
    const name = keys[0];

    if (job[name]['requires'] !== undefined) {
      const indexToRemove = job[name]['requires'].indexOf(jobNameToRemove);
      if (indexToRemove !== -1) {
        job[name]['requires'].splice(indexToRemove, 1);
      }
    }
  }

  return yaml.dump(circleConfigYaml);
}

/** Removes node7 job from CircleCI configuration yaml file. Used as a callback
 * to `updateFile`.
 * @param {string} circleConfigText CircleCI configuration yaml file.
 * @returns {string} Returns updated config file, or undefined if anything is
 * wrong.
 */
function removeNode7FromCircleConfig(circleConfigText) {
  return removeJobFromCircleConfig(circleConfigText, 'node7');
}

/** Main function.
 */
async function main() {
  await updateFile({
    path: '.circleci/config.yml',
    patchFunction: removeNode7FromCircleConfig,
    branch: 'remove-node7-test',
    message: 'chore: removing node7 job from CircleCI',
    comment:
      "We don't need to test on Node 7 anymore. Note: no action is required for this PR for now.",
    reviewers: ['stephenplusplus', 'callmehiphop'],
  });
}

main().catch(err => {
  console.error(err.toString());
});
