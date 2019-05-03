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

import {getConfig} from './config';
import {GitHub, GitHubRepository} from './github';

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
  repository: GitHubRepository,
  branch: string,
  path: string,
  patchFunction: Function,
  message: string
) {
  let file;
  try {
    file = await repository.getFileFromBranch(branch, path);
  } catch (err) {
    console.warn(
      '  cannot get file, skipping this repository:',
      err.toString()
    );
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
      '  patch function returned undefined value, skipping this repository'
    );
    return;
  }
  const encodedPatchedContent = Buffer.from(patchedContent).toString('base64');

  try {
    await repository.updateFileInBranch(
      branch,
      path,
      message,
      encodedPatchedContent,
      oldFileSha
    );
  } catch (err) {
    console.warn(
      `  cannot commit file ${path} to branch ${branch}, skipping this repository:`,
      err.toString()
    );
    return;
  }

  console.log('  success!');
}

export interface UpdateFileInBranchOptions {
  config: string;
  branch: string;
  path: string;
  patchFunction: Function;
  message: string;
  comment: string;
  reviewers: string[];
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
export async function updateFileInBranch(options: UpdateFileInBranchOptions) {
  if (options.path === undefined) {
    throw new Error('updateFile: path is required');
  }

  if (options.patchFunction === undefined) {
    throw new Error('updateFile: patchFunction is required');
  }

  if (options.branch === undefined) {
    throw new Error('updateFile: branch is required');
  }

  if (options.message === undefined) {
    throw new Error('updateFile: message is required');
  }

  const config = await getConfig();
  const github = new GitHub(config);
  const repos = await github.getRepositories();
  for (const repository of repos) {
    console.log(repository.name);
    await processRepository(
      repository,
      options.branch,
      options.path,
      options.patchFunction,
      options.message
    );
  }
}
