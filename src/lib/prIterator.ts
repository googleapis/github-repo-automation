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

import * as meow from 'meow';

import {getConfig} from './config';
import {GitHub, GitHubRepository, PullRequest} from './github';

export interface PRIteratorOptions {
  commandName: string;
  commandDesc: string;
  processMethod:
      (repository: GitHubRepository, pr: PullRequest,
       cli: meow.Result) => Promise<boolean>;
}

/**
 * Main function. Iterates all open pull request in the repositories of the
 * given organization matching given filters. Organization, filters, and GitHub
 * token should be given in the configuration file.
 * @param {string[]} args Command line arguments.
 */
export async function process(cli: meow.Result, options: PRIteratorOptions) {
  if (cli.input.length < 2 || !cli.input[1]) {
    console.log(`Usage: repo ${options.commandName} [regex]`);
    console.log(options.commandDesc);
    return;
  }

  const config = await getConfig();
  const github = new GitHub(config);
  const regex = new RegExp(cli.input[1] || '.*');
  const repos = await github.getRepositories();
  const successful: string[] = [];
  const failed: string[] = [];
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
      const title = pr.title!;
      if (title.match(regex)) {
        const result = await options.processMethod(repository, pr, cli);
        if (result) {
          successful.push(pr.html_url);
        } else {
          failed.push(pr.html_url);
        }
      }
    }
  }

  console.log(`Successfully processed: ${successful.length} pull request(s)`);
  for (const pr of successful) {
    console.log(`  ${pr}`);
  }

  console.log(`Unable to process: ${failed.length} pull requests(s)`);
  for (const pr of failed) {
    console.log(`  ${pr}`);
  }
}
