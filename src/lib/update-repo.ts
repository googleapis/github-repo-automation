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
 * @fileoverview Performs a common tasks of applying the same change to
 * many GitHub repositories, and sends pull requests with the change.
 */

'use strict';

import * as child_process from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';
const exec = util.promisify(child_process.exec);
const readFile = util.promisify(fs.readFile);
const tmp = require('tmp-promise');

import {GitHub} from './github';

/** Updates files in the cloned repository and sends a pull request with
 * this change.
 * @param {GitHubRepository} repository Repository to work with.
 * @param {updateCallback} updateCallback Callback function that should
 * modify the files it wants to update, and return a promise resolving to the
 * list of updated files.
 * @param {string} branch Name for a new branch to use.
 * @param {string} message Commit message and pull request title.
 * @param {string} comment Pull request body.
 * @param {string[]} reviewers Reviewers' GitHub logins for the pull request.
 * @returns {undefined} No return value. Prints its progress to the console.
 */
async function processRepository(
  repository,
  updateCallback,
  branch,
  message,
  comment,
  reviewers
) {
  let tmpDir = await tmp.dir({unsafeCleanup: true});

  let cloneUrl = repository.getRepository()['clone_url'];
  await exec(`git clone ${cloneUrl} ${tmpDir.path}`);

  let filesToUpdate;
  try {
    filesToUpdate = await updateCallback(tmpDir.path);
  } catch (err) {
    console.warn(
      '  callback function threw an exception, skipping this repository'
    );
    return;
  }

  if (filesToUpdate === undefined) {
    console.warn(
      '  callback function returned undefined value, skipping this repository'
    );
    return;
  }
  if (filesToUpdate.length === 0) {
    console.warn(
      '  callback function returned empty list, skipping this repository'
    );
    return;
  }

  let latestCommit;
  try {
    latestCommit = await repository.getLatestCommitToMaster();
  } catch (err) {
    console.warn(
      '  cannot get sha of latest commit, skipping this repository:',
      err.toString()
    );
    return;
  }
  let latestSha = latestCommit['sha'];

  try {
    await repository.createBranch(branch, latestSha);
  } catch (err) {
    console.warn(
      `  cannot create branch ${branch}, skipping this repository:`,
      err.toString()
    );
    return;
  }

  for (let filePath of filesToUpdate) {
    let file;
    try {
      file = await repository.getFile(filePath);
    } catch (err) {
      // ignore: will create new file
    }
    if (file !== undefined && file['type'] !== 'file') {
      console.warn('  requested path is not file, skipping this repository');
      return;
    }
    let oldFileSha = file === undefined ? undefined : file['sha'];

    let patchedContent;
    try {
      patchedContent = await readFile(path.join(tmpDir.path, filePath));
    } catch (err) {
      console.warn(
        `  cannot read file ${filePath}, skipping this repository:`,
        err.toString()
      );
      return;
    }
    let encodedPatchedContent = Buffer.from(patchedContent).toString('base64');

    try {
      if (oldFileSha === undefined) {
        await repository.createFileInBranch(
          branch,
          filePath,
          message,
          encodedPatchedContent
        );
      } else {
        await repository.updateFileInBranch(
          branch,
          filePath,
          message,
          encodedPatchedContent,
          oldFileSha
        );
      }
    } catch (err) {
      console.warn(
        `  cannot commit file ${filePath} to branch ${branch}, skipping this repository:`,
        err.toString()
      );
      return;
    }
  }

  let pullRequest;
  try {
    pullRequest = await repository.createPullRequest(branch, message, comment);
  } catch (err) {
    console.warn(
      `  cannot create pull request for branch ${branch}! Branch is still there.`,
      err.toString()
    );
    return;
  }
  let pullRequestNumber = pullRequest['number'];
  let pullRequestUrl = pullRequest['html_url'];

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

/** Updates files in the cloned repository and sends a pull request with
 * this change.
 * @param {Object} options Options object, should contain the following fields:
 * @param {string} option.config Path to a configuration file. Will use default
 * `./config.yaml` if omitted.
 * @param {updateCallback} options.updateCallback Callback function that should
 * modify the files it wants to update, and return a promise resolving to the
 * list of updated files.
 * @param {string} options.branch Name for a new branch to use.
 * @param {string} options.message Commit message and pull request title.
 * @param {string} options.comment Pull request body.
 * @param {string[]} options.reviewers Reviewers' GitHub logins for the pull request.
 * @returns {undefined} No return value. Prints its progress to the console.
 */
export async function updateRepo(options) {
  let updateCallback = options['updateCallback'];
  if (updateCallback === undefined) {
    console.error('updateRepo: updateCallback is required');
    return;
  }

  let branch = options['branch'];
  if (branch === undefined) {
    console.error('updateRepo: branch is required');
    return;
  }

  let message = options['message'];
  if (message === undefined) {
    console.error('updateRepo: message is required');
    return;
  }

  let comment = options['comment'] || '';
  let reviewers = options['reviewers'] || [];

  let github = new GitHub(options.config);
  await github.init();

  let repos = await github.getRepositories();
  for (let repository of repos) {
    console.log(repository.name);
    await processRepository(
      repository,
      updateCallback,
      branch,
      message,
      comment,
      reviewers
    );
  }
}

/** Callback async function that performs required change to the cloned repository.
 * @callback updateCallback
 * @param {string} path Path to a temporary directory where the repository is
 * cloned.
 * @returns {Promise<string[]>} Promise resolving to a list of new or updated files
 * to include in commit.
 * Must resolve to `undefined` if the change was not applied for
 * any reason. In this case, no change will be committed.
 */
