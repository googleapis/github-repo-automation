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

import * as meow from 'meow';
import Q from 'p-queue';
import ora from 'ora';

import {getConfig} from './config';
import {GitHub, GitHubRepository, PullRequest} from './github';

export interface PRIteratorOptions {
  commandName: string; // approve
  commandNamePastTense: string; // approved
  commandActive: string; // approving
  commandDesc: string;
  processMethod: (
    repository: GitHubRepository,
    pr: PullRequest,
    cli: meow.Result
  ) => Promise<boolean>;
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

  const concurrency = cli.flags.concurrency
    ? Number(cli.flags.concurrency)
    : 15;
  const config = await getConfig();
  const github = new GitHub(config);
  const regex = new RegExp(cli.input[1] || '.*');
  const repos = await github.getRepositories();
  const successful: string[] = [];
  const failed: string[] = [];
  let processed = 0;
  let scanned = 0;
  let prs = new Array<{repo: GitHubRepository; pr: PullRequest}>();

  const orb1 = ora(
    `[${scanned}/${repos.length}] Scanning repos for PRs`
  ).start();

  // Concurrently find all PRs in all relevant repositories
  const q = new Q({concurrency});
  q.addAll(
    repos.map(repo => {
      return async () => {
        try {
          const localPRs = await repo.listPullRequests();
          prs.push(
            ...localPRs.map(pr => {
              return {repo, pr};
            })
          );
          scanned++;
          orb1.text = `[${scanned}/${repos.length}] Scanning repos for PRs`;
        } catch (err) {
          failed.push('cannot list open pull requests:', err.toString());
        }
      };
    })
  );
  await q.onIdle();

  // Filter the list of PRs to ones who match the PR title
  prs = prs.filter(prSet => prSet.pr.title.match(regex));
  orb1.succeed(
    `[${scanned}/${repos.length}] repositories scanned, ${prs.length} matching PRs found`
  );

  // Concurrently process each relevant PR
  const orb2 = ora(
    `[${processed}/${prs.length}] ${options.commandNamePastTense}`
  ).start();
  q.addAll(
    prs.map(prSet => {
      return async () => {
        const title = prSet.pr.title!;
        if (title.match(regex)) {
          orb2.text = `[${processed}/${prs.length}] ${options.commandActive} PRs`;
          const result = await options.processMethod(prSet.repo, prSet.pr, cli);
          if (result) {
            successful.push(prSet.pr.html_url);
          } else {
            failed.push(prSet.pr.html_url);
          }
          processed++;
          orb2.text = `[${processed}/${prs.length}] ${options.commandActive} PRs`;
        }
      };
    })
  );
  await q.onIdle();

  orb2.succeed(
    `[${processed}/${prs.length}] PRs ${options.commandNamePastTense}`
  );

  console.log(`Successfully processed: ${successful.length} pull request(s)`);
  for (const pr of successful) {
    console.log(`  ${pr}`);
  }

  if (failed.length > 0) {
    console.log(`Unable to process: ${failed.length} pull requests(s)`);
    for (const pr of failed) {
      console.log(`  ${pr}`);
    }
  }
}
