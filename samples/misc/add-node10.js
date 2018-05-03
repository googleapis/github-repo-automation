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
 * @fileoverview Fix CircleCI configuration file in all repositories: add
 * node10 task to workflows and dependencies.
 */

'use strict';

const yaml = require('js-yaml');
const updateFile = require('../../lib/update-file.js');
const extend = require('extend');

/** Copies 'node8' task to 'node10', make all tasks working on 'node8' work on
 * 'node10'.
 * @param {string} circleConfigText CircleCI configuration yaml file.
 * @returns {string} Returns updated config file, or undefined if anything is
 * wrong.
 */
function applyFix(circleConfigText) {
  let circleConfigYaml = yaml.load(circleConfigText);

  let testsWorkflowJobs = circleConfigYaml['workflows']['tests']['jobs'];
  let node8;
  let node9position;

  for (let jobIdx in testsWorkflowJobs) {
    let job = testsWorkflowJobs[jobIdx];
    let keys = Object.keys(job);
    let name = keys[0];

    switch (name) {
      case 'node9':
        node9position = jobIdx;
        break;
      case 'node8':
        node8 = job;
        break;
      case 'node10':
        console.log('ERR: node10 is already defined, skipping this repo');
        return undefined;
    }

    if (
      job[name]['requires'] !== undefined &&
      job[name]['requires'].includes('node8')
    ) {
      job[name]['requires'].push('node10');
    }
  }

  if (node8 === undefined) {
    console.log('ERR: no node8 job found in workflow, skipping this repo');
    return undefined;
  }

  if (node9position === undefined) {
    console.log('ERR: no node9 job found in workflow, skipping this repo');
    return undefined;
  }

  let node10 = extend(true, {}, node8);
  node10['node10'] = node10['node8'];
  delete node10['node8'];
  testsWorkflowJobs.splice(parseInt(node9position) + 1, 0, node10);

  let jobs = circleConfigYaml['jobs'];
  let installCmd;
  let linkSamplesCmd;
  for (let [, job] of Object.entries(jobs)) {
    if (job['steps'] !== undefined) {
      for (let step of job['steps']) {
        if (step['run'] !== undefined) {
          if (
            step['run']['name'].match(/Install and link/) &&
            installCmd === undefined
          ) {
            installCmd = step['run'];
          }
          if (
            step['run']['name'].match(
              /Link the module being tested to the samples/
            ) &&
            linkSamplesCmd === undefined
          ) {
            linkSamplesCmd = step['run'];
          }
        }
      }
    }
  }

  let node8def;
  for (let [name, job] of Object.entries(jobs)) {
    if (job['steps'] !== undefined) {
      for (let step of job['steps']) {
        if (step['run'] !== undefined) {
          if (
            step['run']['name'].match(/Install/) &&
            installCmd !== undefined
          ) {
            step['run'] = installCmd;
          }
          if (
            step['run']['name'].match(
              /Link the module being tested to the samples/
            ) &&
            linkSamplesCmd !== undefined
          ) {
            step['run'] = linkSamplesCmd;
          }
        }
      }
    }

    if (name === 'node8') {
      node8def = job;
    }

    if (name === 'node10') {
      console.log(
        'ERR: node10 job definition already exists, skipping this repo'
      );
      return undefined;
    }
  }

  if (node8def === undefined) {
    console.log('ERR: node node8 job definition found, skipping this repo');
    return undefined;
  }

  let node10def = extend(true, {}, node8def);
  node10def['steps'] = jobs['node8']['steps']; // want the same object here
  node10def['docker'][0]['image'] = 'node:10';
  // we want to keep an order of jobs so...
  let order = Object.keys(jobs);
  order.splice(order.indexOf('node9') + 1, 0, 'node10');
  jobs['node10'] = node10def;
  let newJobs = {};
  for (let key of order) {
    newJobs[key] = jobs[key];
  }
  circleConfigYaml['jobs'] = newJobs;

  let result = yaml.dump(circleConfigYaml);
  result = result.replace(/ref_0/g, 'workflow_jobs');
  result = result.replace(/ref_1/g, 'unit_tests_steps');
  result = result.replace(/ref_2/g, 'remove_package_lock');
  result = result.replace(/ref_3/g, 'npm_install_and_link');
  result = result.replace(/ref_4/g, 'samples_npm_install_and_link');
  return result;
}

/** Main function.
 */
async function main() {
  await updateFile({
    path: '.circleci/config.yml',
    patchFunction: applyFix,
    branch: 'test-on-node10',
    message: 'chore: test on node10',
    comment: `This PR brings an updated configuration file for CircleCI:

- test on Node.js v10
- more YAML references to make config more readable (at least I hope so)

This is an automated PR prepared using [github-repo-automation](https://github.com/googleapis/github-repo-automation).
`,
    reviewers: ['stephenplusplus', 'callmehiphop'],
  });
}

main().catch(err => {
  console.error(err.toString());
});
