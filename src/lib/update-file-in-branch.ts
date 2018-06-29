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
 * @fileoverview Performs a common tasks of applying the same change to one file
 * in the given branch in many GitHub repositories.
 */

'use strict';

import {GitHub} from './github';

/**
 * Updates and commits one existing file in the given branch of the given
 * repository.
 * @param {GitHubRepository} repository Repository to work with.
 * @param {string} branch Name of an existing branch to update.
 * @param {string} path Path to an existing file to update.
 * @param {patchFunction} patchFunction Callback function that should modify the
 * file.
 * @param {string} message Commit message.
 * @returns {undefined} No return value. Prints its progress to the console.
 */
async function processRepository(
    repository, branch, path, patchFunction, message) {
  let file;
  try {
    file = await repository.getFileFromBranch(branch, path);
  } catch (err) {
    console.warn(
        '  cannot get file, skipping this repository:', err.toString());
    return;
  }
  if (file['type'] !== 'file') {
    console.warn('  requested path is not file, skipping this repository');
    return;
  }

  const oldFileSha = file['sha'];
  const decodedContent = Buffer.from(file['content'], 'base64').toString();
  const patchedContent = patchFunction(decodedContent);
  if (patchedContent === undefined) {
    console.warn(
        '  patch function returned undefined value, skipping this repository');
    return;
  }
  const encodedPatchedContent = Buffer.from(patchedContent).toString('base64');

  try {
    await repository.updateFileInBranch(
        branch, path, message, encodedPatchedContent, oldFileSha);
  } catch (err) {
    console.warn(
        `  cannot commit file ${path} to branch ${
            branch}, skipping this repository:`,
        err.toString());
    return;
  }

  console.log('  success!');
}

/**
 * Updates one existing file in the given branch of all the repositories.
 * @param {Object} options Options object, should contain the following fields:
 * @param {string} option.config Path to a configuration file. Will use default
 * `./config.yaml` if omitted.
 * @param {string} options.branch Name for a new branch to use.
 * @param {string} options.path Path to an existing file to update.
 * @param {patchFunction} options.patchFunction Callback function that should modify the
 * file.
 * @param {string} options.message Commit message and pull request title.
 * @param {string} options.comment Pull request body.
 * @param {string[]} options.reviewers Reviewers' GitHub logins for the pull request.
 * @returns {undefined} No return value. Prints its progress to the console.
 */
export async function updateFileInBranch(options) {
  const path = options['path'];
  if (path === undefined) {
    console.error('updateFile: path is required');
    return;
  }

  const patchFunction = options['patchFunction'];
  if (patchFunction === undefined) {
    console.error('updateFile: path is required');
    return;
  }

  const branch = options['branch'];
  if (branch === undefined) {
    console.error('updateFile: branch is required');
    return;
  }

  const message = options['message'];
  if (message === undefined) {
    console.error('updateFile: message is required');
    return;
  }

  const github = new GitHub(options.config);
  await github.init();

  const repos = await github.getRepositories();
  for (const repository of repos) {
    console.log(repository.name);
    await processRepository(repository, branch, path, patchFunction, message);
  }
}
