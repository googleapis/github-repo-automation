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

import * as childProcess from 'child_process';
const commandLineUsage = require('command-line-usage');
import {updateRepo, UpdateRepoOptions} from './lib/update-repo';
import {question} from './lib/question';
import * as meow from 'meow';
import {meowFlags} from './cli';

// tslint:disable-next-line:no-any
const exec = (command: string, options?: object): Promise<string> =>
  new Promise<string>((resolve, reject) => {
    childProcess.exec(command, options, (err, stdout, stderr) => {
      if (err) {
        reject(stderr);
      } else {
        resolve(stdout.toString());
      }
    });
  });

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
      '                       [{bold --silent}] {underline command}',
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
  const gitStatus = await exec('git status --porcelain --untracked-files');
  const lines = gitStatus.split('\n').filter((line: string) => line !== '');
  const files: string[] = [];
  for (const line of lines) {
    const matchResult = line.match(/^(?: M|\?\?) (.*)$/);
    if (matchResult !== null) {
      files.push(matchResult[1]);
    }
  }
  return files;
}

/**
 * Checks if options are valid and it's OK to continue.
 * Prints a message to stderr if not, and returns false.
 * @param {Object} options Options object, as returned by meow.
 * @returns {Boolean} True if OK to continue, false otherwise.
 */
function checkOptions(cli: meow.Result<typeof meowFlags>) {
  if (cli.flags.help) {
    console.log(commandLineUsage(helpSections));
    return false;
  }

  let badOptions = false;
  if (cli.flags.branch === undefined) {
    badOptions = true;
    console.error('Error: --branch is required.');
  }
  if (cli.flags.message === undefined) {
    badOptions = true;
    console.error('Error: --message is required.');
  }
  if (cli.flags.comment === undefined) {
    badOptions = true;
    console.error('Error: --comment is required.');
  }
  if (cli.input[1] === undefined) {
    badOptions = true;
    console.error('Error: command is required.');
  }
  if (badOptions) {
    console.error(
      'Please run the script with --help to get some help on the command line options.'
    );
    return false;
  }

  return true;
}

/**
 * A function to be used in callback to `update-repo.js`.
 * Executes the given command in the repository cloned into the given
 * location, should return a promise resolving to a list of files to
 * commit.
 * @param {Object} options Command-line options, as returned by meow.
 * @param {String} repoPath Path to a folder where the current repository is
 * cloned.
 * @returns {Promise<string[]>} A promise resolving to a list of files to
 * commit.
 */
async function updateCallback(
  cli: meow.Result<typeof meowFlags>,
  repoPath: string
) {
  const cwd = process.cwd();
  try {
    process.chdir(repoPath);
    const command = cli.input.slice(1).join(' ');
    console.log('Executing command:', command);
    const execResult = await exec(command); // will throw an error if non-zero exit code
    const files = await getFilesToCommit();
    if (files.length > 0 && !cli.flags.silent) {
      for (;;) {
        const response = await question(
          'Going to commit the following files:\n' +
            files.map(line => `  ${line}\n`).join('') +
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

/**
 * Main function.
 */
export async function main(cli: meow.Result<typeof meowFlags>) {
  if (!checkOptions(cli)) {
    return;
  }
  const updateRepoOptions = {
    updateCallback: (path: string) => updateCallback(cli, path),
    branch: cli.flags.branch,
    message: cli.flags.message,
    comment: cli.flags.comment,
  } as UpdateRepoOptions;
  if (cli.flags.reviewers !== undefined) {
    updateRepoOptions.reviewers = (cli.flags.reviewers as string).split(
      /\s*,\s*/
    );
  }
  await updateRepo(updateRepoOptions);
}
