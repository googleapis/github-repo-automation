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

import axios from 'axios';
import {GitHub, GitHubRepository, PullRequest} from './lib/github';
import {question} from './lib/question';
import * as meow from 'meow';
import {getConfig} from './lib/config';

/**
 * Downloads and prints patch file (well, actually, any file) to a console.
 * @param {string} patchUrl URL to download.
 */
async function showPatch(patchUrl: string) {
  const axiosResult = await axios.get(patchUrl);
  const patch = axiosResult.data;
  console.log(patch);
}

/**
 * Process one pull request: ask the user to approve, show patch, or skip it.
 * @param {GitHubRepository} repository GitHub repository for this pull request.
 * @param {Object} pr Pull request object, as returned by GitHub API.
 */
async function processPullRequest(
    repository: GitHubRepository, pr: PullRequest, auto: boolean) {
  const title = pr.title;
  const htmlUrl = pr.html_url;
  const patchUrl = pr.patch_url;
  const author = pr.user.login;
  const baseSha = pr.base.sha;
  const ref = pr.head.ref;

  console.log(`  [${author}] ${htmlUrl}: ${title}`);

  let latestCommit;
  try {
    latestCommit = await repository.getLatestCommitToMaster();
  } catch (err) {
    console.warn(
        '    cannot get sha of latest commit to master, skipping:',
        err.toString());
    return;
  }
  const latestMasterSha = latestCommit['sha'];

  if (latestMasterSha !== baseSha) {
    for (;;) {
      let response: string;
      if (auto) {
        response = 'u';
      } else {
        response = await question(
            'PR branch is out of date. What to do? [u]pdate branch, show [p]atch, [s]kip: ');
      }

      if (response === 'u') {
        try {
          await repository.updateBranch(ref, 'master');
          console.log(
              'You might not be able to merge immediately because CI tasks will take some time.');
          break;
        } catch (err) {
          console.warn(
              `    cannot update branch for PR ${htmlUrl}, skipping:`,
              err.toString());
          return;
        }
      } else if (response === 'p') {
        await showPatch(patchUrl);
        continue;
      } else if (response === 's') {
        console.log('   skipped');
        return;
      }
    }
  }

  for (;;) {
    let response: string;
    if (auto) {
      response = 'a';
    } else {
      response = await question(
          'What to do? [a]pprove and merge, show [p]atch, [s]kip: ');
    }
    if (response === 'a') {
      try {
        await repository.approvePullRequest(pr);
        console.log('    approved!');
      } catch (err) {
        console.warn(
            `    error trying to approve PR ${htmlUrl}:`, err.toString());
        return;
      }
      try {
        await repository.mergePullRequest(pr);
        console.log('    merged!');
      } catch (err) {
        console.warn(
            `    error trying to merge PR ${htmlUrl}:`, err.toString());
        return;
      }
      try {
        await repository.deleteBranch(ref);
        console.log('    branch deleted!');
      } catch (err) {
        console.warn(
            `    error trying to delete branch ${htmlUrl}:`, err.toString());
        return;
      }
      break;
    } else if (response === 'p') {
      await showPatch(patchUrl);
      continue;
    } else if (response === 's') {
      console.log('   skipped');
      break;
    }
  }
}

/**
 * Main function. Iterates all open pull request in the repositories of the
 * given organization matching given filters. Organization, filters, and GitHub
 * token should be given in the configuration file.
 * @param {string[]} args Command line arguments.
 */
export async function main(cli: meow.Result) {
  if (cli.input.length < 2 || !cli.input[1]) {
    console.log(`Usage: repo approve [regex] [--auto]`);
    console.log(
        'Will show all open PRs with title matching regex and allow to approve them.');
    return;
  }

  const config = await getConfig();
  const github = new GitHub(config);
  const regex = new RegExp(cli.input[1] || '.*');
  const auto = cli.flags.auto;
  const repos = await github.getRepositories();
  for (const repository of repos) {
    console.log(repository.name);
    let prs: PullRequest[];
    try {
      prs = await repository.listPullRequests();
    } catch (err) {
      console.warn('  cannot list open pull requests:', err.toString());
      continue;
    }

    for (const pr of prs) {
      const title = pr.title;
      if (title.match(regex)) {
        await processPullRequest(repository, pr, auto);
      }
    }
  }
}
