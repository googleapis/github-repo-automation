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
 * @fileoverview Runs the given command in each repository, and commits
 * files that were added or changed.
 */

'use strict';

const util = require('util');
const child_process = require('child_process');
const exec = util.promisify(child_process.exec);
const commandLineArgs = require('command-line-args');
const commandLineUsage = require('command-line-usage');
const updateRepo = require('./lib/update-repo.js');
const question = require('./lib/question.js');

const commandLineOptions = [
  {name: 'help', alias: 'h', type: Boolean, description: 'Show help.'},
  {
    name: 'branch',
    alias: 'b',
    type: String,
    description: 'Branch name to create.',
  },
  {
    name: 'message',
    alias: 'm',
    type: String,
    description: 'Commit message and pull request title.',
  },
  {
    name: 'comment',
    alias: 'c',
    type: String,
    description: 'Pull request comment.',
  },
  {
    name: 'reviewers',
    alias: 'r',
    type: String,
    description: 'Comma-separated list of reviewers.',
  },
  {
    name: 'silent',
    alias: 's',
    type: Boolean,
    description: 'No interactive questions - just make commits. Use carefully.',
  },
  {
    name: 'execute',
    alias: 'e',
    type: String,
    defaultOption: true,
    description: 'Command to execute inside the cloned repository folder.',
  },
];

const helpSections = [
  {
    header: 'apply-change.js',
    content: [
      'Iterates over repositories defined in {bold config.yaml}, clones each repository ',
      'into a temporary folder and executes the provided command in that folder. ',
      'If the command exits with exit code 0, all created and edited files are ',
      'checked in into a new branch, and a new pull request is created.',
    ],
  },
  {
    header: 'Synopsis',
    content: [
      '$ node apply-change.js {bold --branch} {underline branch} {bold --message} {underline message}',
      '                       {bold --comment} {underline comment} [{bold --reviewers} {underline username}[,{underline username}...]]',
      '                       {underline command}',
      '$ node apply-change.js {bold --help}',
    ],
    raw: true,
  },
  {
    header: 'Options',
    optionList: commandLineOptions,
  },
];

/**
 * Runs `git status` and parses the output to get a list of added and
 * changed files to commit.
 * @returns {string[]} List of filenames.
 */
async function getFilesToCommit() {
  let gitStatus = await exec('git status --porcelain');
  let lines = gitStatus.stdout.split('\n').filter(line => line !== '');
  let files = [];
  for (let line of lines) {
    let matchResult = line.match(/^(?: M|\?\?) (.*)$/);
    if (matchResult !== null) {
      files.push(matchResult[1]);
    }
  }
  return files;
}

/** Checks if options are valid and it's OK to continue.
 * Prints a message to stderr if not, and returns false.
 * @param {Object} options Options object, as returned by commandLineArgs().
 * @returns {Boolean} True if OK to continue, false otherwise.
 */
function checkOptions(options) {
  if (options.help) {
    console.log(commandLineUsage(helpSections));
    return false;
  }

  let badOptions = false;
  if (options.branch === undefined) {
    badOptions = true;
    console.error('Error: --branch is required.');
  }
  if (options.message === undefined) {
    badOptions = true;
    console.error('Error: --message is required.');
  }
  if (options.comment === undefined) {
    badOptions = true;
    console.error('Error: --comment is required.');
  }
  if (options.execute === undefined) {
    badOptions = true;
    console.error('Error: command to execute is required.');
  }
  if (badOptions) {
    console.error(
      'Please run the script with --help to get some help on the command line options.'
    );
    return false;
  }

  return true;
}

/** A function to be used in callback to `update-repo.js`.
 * Executes the given command in the repository cloned into the given
 * location, should return a promise resolving to a list of files to
 * commit.
 * @param {Object} options Command-line options, as returned by
 * commandLineArgs().
 * @param {String} repoPath Path to a folder where the current repository is
 * cloned.
 * @returns {Promise<string[]>} A promise resolving to a list of files to
 * commit.
 */
async function updateCallback(options, repoPath) {
  let cwd = process.cwd();
  try {
    process.chdir(repoPath);
    let execResult = await exec(options.execute); // will throw an error if non-zero exit code
    if (execResult.stdout !== '') {
      console.log(execResult.stdout);
    }
    if (execResult.stderr !== '') {
      console.error(execResult.stderr);
    }
    let files = await getFilesToCommit();
    if (files.length > 0 && !options.silent) {
      for (;;) {
        let response = await question(
          'Going to commit the following files:\n' +
            files.map(line => `  ${line}\n`) +
            'Do it? [y/n]'
        );
        if (response === 'y') {
          break;
        } else if (response === 'n') {
          throw new Error('Change rejected by user');
        } else {
          continue;
        }
      }
    }
    process.chdir(cwd);
    return Promise.resolve(files);
  } catch (err) {
    process.chdir(cwd);
    return Promise.reject(err);
  }
}

/** Main function.
 */
async function main() {
  const options = commandLineArgs(commandLineOptions);
  if (!checkOptions(options)) {
    return;
  }
  let updateRepoOptions = {
    updateCallback: path => updateCallback(options, path),
    branch: options.branch,
    message: options.message,
    comment: options.comment,
  };
  if (options.reviewers !== undefined) {
    updateRepoOptions['reviewers'] = options.reviewers.split(/\s*,\s*/);
  }
  await updateRepo(updateRepoOptions);
}

main().catch(err => {
  console.error(err.toString());
});
