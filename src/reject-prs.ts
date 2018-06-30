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
 * @fileoverview A quick'n'dirty console UI to close a bunch of pull requests.
 * Usage: `repo reject [regex]`  -- will go through open PRs with title
 * matching `regex`, one by one.
 */

'use strict';

import {GitHub, GitHubRepository, PullRequest} from './lib/github';
import meow from 'meow';
import {getConfig} from './lib/config';

/**
 * Process one pull request: close it
 * @param {GitHubRepository} repository GitHub repository for this pull request.
 * @param {Object} pr Pull request object, as returned by GitHub API.
 */
async function processPullRequest(
    repository: GitHubRepository, pr: PullRequest) {
  const title = pr.title;
  const htmlUrl = pr.html_url;
  const author = pr.user.login;
  console.log(`  [${author}] ${htmlUrl}: ${title}`);
  try {
    await repository.closePullRequest(pr);
  } catch (err) {
    console.warn('    cannot close pull request, skipping:', err.toString());
  }
}

/**
 * Main function. Iterates all open pull request in the repositories of the
 * given organization matching given filters. Organization, filters, and GitHub
 * token should be given in the configuration file.
 * @param {string[]} args Command line arguments.
 */
export async function main(options: meow.Result) {
  if (options.input.length < 2 || !options.input[1]) {
    console.log(`Usage: repo reject [regex]`);
    console.log('Automatically reject all PRs that match a given filter.');
    return;
  }
  const config = await getConfig();
  const github = new GitHub(config);
  const regex = new RegExp(options.input[1]);
  const repos = await github.getRepositories();
  for (const repository of repos) {
    console.log(repository.name);
    let prs;
    try {
      prs = await repository.listPullRequests();
    } catch (err) {
      console.warn('  cannot list open pull requests:', err.toString());
      continue;
    }

    for (const pr of prs) {
      const title = pr['title'];
      if (title.match(regex)) {
        console.log(`deleting un...`);
        await processPullRequest(repository, pr);
      }
    }
  }
}
