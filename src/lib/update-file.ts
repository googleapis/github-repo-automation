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
 * in many GitHub repositories, and sends pull requests with the change.
 */

import {getConfig} from './config';
import {GitHub, GitHubRepository} from './github';

/**
 * Updates one existing file in the repository and sends a pull request with
 * this change.
 * @param {GitHubRepository} repository Repository to work with.
 * @param {string} path Path to an existing file to update.
 * @param {patchFunction} patchFunction Callback function that should modify the
 * file.
 * @param {string} branch Name for a new branch to use.
 * @param {string} message Commit message and pull request title.
 * @param {string} comment Pull request body.
 * @param {string[]} reviewers Reviewers' GitHub logins for the pull request.
a * @returns {undefined} No return value. Prints its progress to the console.
 */
async function processRepository(
  repository: GitHubRepository,
  path: string,
  patchFunction: Function,
  branch: string,
  message: string,
  comment: string,
  reviewers: string[]
) {
  let file;
  try {
    file = await repository.getFile(path);
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

  let latestCommit: {[index: string]: string};
  try {
    latestCommit = await repository.getLatestCommitToBaseBranch();
  } catch (err) {
    console.warn(
      '  cannot get sha of latest commit, skipping this repository:',
      err.toString()
    );
    return;
  }
  const latestSha = latestCommit['sha'];

  try {
    await repository.createBranch(branch, latestSha);
  } catch (err) {
    console.warn(
      `  cannot create branch ${branch}, skipping this repository:`,
      err.toString()
    );
    return;
  }

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

  let pullRequest;
  try {
    pullRequest = await repository.createPullRequest(branch, message, comment);
  } catch (err) {
    console.warn(
      `  cannot create pull request for branch ${branch} -> base ${repository.baseBranch}! Branch is still there.`,
      err.toString()
    );
    return;
  }
  const pullRequestNumber = pullRequest.number!;
  const pullRequestUrl = pullRequest.html_url;

  if (reviewers.length > 0) {
    try {
      await repository.requestReview(pullRequestNumber, reviewers);
    } catch (err) {
      console.warn(
        `  cannot request review for pull request #${pullRequestNumber}! Pull request is still there.`,
        err.toString()
      );
      return;
    }
  }

  console.log(`  success! ${pullRequestUrl}`);
}

export interface UpdateFileOptions {
  config: string;
  path: string;
  patchFunction: Function;
  branch: string;
  message: string;
  comment: string;
  reviewers: string[];
}

/**
 * Updates one existing file in the repository and sends a pull request with
 * this change.
 * @param {Object} options Options object, should contain the following fields:
 * @param {string} option.config Path to a configuration file. Will use default
 * `./config.yaml` if omitted.
 * @param {string} options.path Path to an existing file to update.
 * @param {patchFunction} options.patchFunction Callback function that should modify the
 * file.
 * @param {string} options.branch Name for a new branch to use.
 * @param {string} options.message Commit message and pull request title.
 * @param {string} options.comment Pull request body.
 * @param {string[]} options.reviewers Reviewers' GitHub logins for the pull request.
 * @returns {undefined} No return value. Prints its progress to the console.
 */
export async function updateFile(options: UpdateFileOptions) {
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

  const comment = options.comment || '';
  const reviewers = options.reviewers || [];

  const config = await getConfig();
  const github = new GitHub(config);
  const repos = await github.getRepositories();
  for (const repository of repos) {
    console.log(repository.name);
    await processRepository(
      repository,
      options.path,
      options.patchFunction,
      options.branch,
      options.message,
      comment,
      reviewers
    );
  }
}

/**
 * Callback function that performs required change to the file. The function
 * may apply a patch, or parse and change the file, or do whatever it needs.
 * @callback patchFunction
 * @param {string} content Contents of the file to update.
 * @returns {string} Must return `undefined` if the change was not applied for
 * any reason. In this case, no change will be committed. If the change was
 * applied successfully, return the new contents of the file.
 */
