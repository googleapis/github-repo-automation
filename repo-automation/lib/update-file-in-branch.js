/**
 * @fileoverview Performs a common tasks of applying the same change to one file
 * in many GitHub repositories.
 */

'use strict';

const GitHub = require('./github.js');

/** Updates and commits one existing file in the given branch of the given
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
  repository,
  branch,
  path,
  patchFunction,
  message
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

  let oldFileSha = file['sha'];
  let decodedContent = Buffer.from(file['content'], 'base64');
  let patchedContent = patchFunction(decodedContent);
  if (patchedContent === undefined) {
    console.warn(
      '  patch function returned undefined value, skipping this repository'
    );
    return;
  }
  let encodedPatchedContent = Buffer.from(patchedContent).toString('base64');

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

/** Updates one existing file in the given branch of all the repositories.
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
async function updateOneFileInBranch(options) {
  let path = options['path'];
  if (path === undefined) {
    console.error('updateOneFile: path is required');
    return;
  }

  let patchFunction = options['patchFunction'];
  if (patchFunction === undefined) {
    console.error('updateOneFile: path is required');
    return;
  }

  let branch = options['branch'];
  if (branch === undefined) {
    console.error('updateOneFile: branch is required');
    return;
  }

  let message = options['message'];
  if (message === undefined) {
    console.error('updateOneFile: message is required');
    return;
  }

  let github = new GitHub(options.config);
  await github.init();

  let repos = await github.getRepositories();
  for (let repository of repos) {
    console.log(repository.name);
    await processRepository(repository, branch, path, patchFunction, message);
  }
}

/** Callback function that performs required change to the file. The function
 * may apply a patch, or parse and change the file, or do whatever it needs.
 * @callback patchFunction
 * @param {string} content Contents of the file to update.
 * @returns {string} Must return `undefined` if the change was not applied for
 * any reason. In this case, no change will be committed. If the change was
 * applied successfully, return the new contents of the file.
 */

module.exports = updateOneFileInBranch;
