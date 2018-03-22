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
 * @fileoverview A quick'n'dirty console UI to approve a bunch of pull requests.
 * Usage: `node approve-prs.js [regex]`  -- will go through open PRs with title
 * matching `regex`, one by one. Without a regex, will go through all open PRs.
 */

'use strict';

const axios = require('axios');
const GitHub = require('./lib/github.js');
const question = require('./lib/question.js');

/** Downloads and prints patch file (well, actually, any file) to a console.
 * @param {string} patch_url URL to download.
 */
async function showPatch(patch_url) {
  let axiosResult = await axios.get(patch_url);
  let patch = axiosResult.data;
  console.log(patch);
}

/** Process one pull request: ask the user to approve, show patch, or skip it.
 * @param {GitHubRepository} repository GitHub repository for this pull request.
 * @param {Object} pr Pull request object, as returned by GitHub API.
 */
async function processPullRequest(repository, pr) {
  let title = pr['title'];
  let html_url = pr['html_url'];
  let patch_url = pr['patch_url'];
  let author = pr['user']['login'];
  let baseSha = pr['base']['sha'];
  let ref = pr['head']['ref'];

  console.log(`  [${author}] ${html_url}: ${title}`);

  let latestCommit;
  try {
    latestCommit = await repository.getLatestCommitToMaster();
  } catch (err) {
    console.warn(
      '    cannot get sha of latest commit to master, skipping:',
      err.toString()
    );
    return;
  }
  let latestMasterSha = latestCommit['sha'];

  if (latestMasterSha !== baseSha) {
    for (;;) {
      let response = await question(
        'PR branch is out of date. What to do? [u]pdate branch, show [p]atch, [s]kip: '
      );
      if (response === 'u') {
        try {
          await repository.updateBranch(ref, 'master');
          console.log(
            'You might not be able to merge immediately because CI tasks will take some time.'
          );
          break;
        } catch (err) {
          console.warn(
            `    cannot update branch for PR ${html_url}, skipping:`,
            err.toString()
          );
          return;
        }
      } else if (response === 'p') {
        await showPatch(patch_url);
        continue;
      } else if (response === 's') {
        console.log('   skipped');
        return;
      }
    }
  }

  for (;;) {
    let response = await question(
      'What to do? [a]pprove and merge, show [p]atch, [s]kip: '
    );
    if (response === 'a') {
      try {
        await repository.approvePullRequest(pr);
        console.log('    approved!');
      } catch (err) {
        console.warn(
          '    error trying to approve PR ${html_url}:',
          err.toString()
        );
        return;
      }
      try {
        await repository.mergePullRequest(pr);
        console.log('    merged!');
      } catch (err) {
        console.warn(
          '    error trying to merge PR ${html_url}:',
          err.toString()
        );
        return;
      }
      break;
    } else if (response === 'p') {
      await showPatch(patch_url);
      continue;
    } else if (response === 's') {
      console.log('   skipped');
      break;
    }
  }
}

/** Main function. Iterates all open pull request in the repositories of the
 * given organization matching given filters. Organization, filters, and GitHub
 * token should be given in the configuration file.
 * @param {string[]} args Command line arguments.
 */
async function main(args) {
  if (args.length > 3 || args[2] === '--help') {
    console.log(`Usage: ${process.argv0} ${args[1]} [regex]`);
    console.log(
      'Will show all open PRs with title matching regex and allow to approve them.'
    );
    return;
  }

  let github = new GitHub();
  await github.init();

  let regex = new RegExp(args[2] || '.*');
  let repos = await github.getRepositories();
  for (let repository of repos) {
    console.log(repository.name);
    let prs;
    try {
      prs = await repository.listPullRequests();
    } catch (err) {
      console.warn('  cannot list open pull requests:', err.toString());
      continue;
    }

    for (let pr of prs) {
      let title = pr['title'];
      if (title.match(regex)) {
        await processPullRequest(repository, pr);
      }
    }
  }
}

main(process.argv).catch(err => {
  console.error(err.toString());
});
