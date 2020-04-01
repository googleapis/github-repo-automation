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
import {meowFlags} from '../cli';
import Q from 'p-queue';
import ora = require('ora');

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
    cli: meow.Result<typeof meowFlags>
  ) => Promise<boolean>;
}

/**
 * Main function. Iterates all open pull request in the repositories of the
 * given organization matching given filters. Organization, filters, and GitHub
 * token should be given in the configuration file.
 * @param {string[]} args Command line arguments.
 */
export async function process(
  cli: meow.Result<typeof meowFlags>,
  options: PRIteratorOptions
) {
  if (!cli.flags.title && !cli.flags.branch) {
    console.log(
      `Usage: repo ${options.commandName} [--branch branch] [--title title]`
    );
    console.log(`Either branch name or title regex must present.`);
    console.log(options.commandDesc);
    return;
  }

  const concurrency = cli.flags.concurrency
    ? Number(cli.flags.concurrency)
    : 15;
  const config = await getConfig();
  const github = new GitHub(config);
  const regex = new RegExp((cli.flags.title as string) || '.*');
  const repos = await github.getRepositories();
  const successful: PullRequest[] = [];
  const failed: PullRequest[] = [];
  let error: string | undefined;
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
          error = `cannot list open pull requests: ${err.toString()}`;
        }
      };
    })
  );
  await q.onIdle();

  // Filter the list of PRs to ones who match the PR title and/or the branch name
  prs = prs.filter(prSet => prSet.pr.title.match(regex));
  if (cli.flags.branch) {
    prs = prs.filter(prSet => prSet.pr.head.ref === cli.flags.branch);
  }
  if (cli.flags.author) {
    prs = prs.filter(prSet => prSet.pr.user.login === cli.flags.author);
  }
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
            successful.push(prSet.pr);
          } else {
            failed.push(prSet.pr);
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

  // Pretty-print as a table
  const maxUrlLength = prs
    .map(pr => pr.pr)
    .reduce(
      (maxLength: number, pr: PullRequest) =>
        pr.html_url.length > maxLength ? pr.html_url.length : maxLength,
      0
    );

  console.log(`Successfully processed: ${successful.length} pull request(s)`);
  for (const pr of successful) {
    console.log(`  ${pr.html_url.padEnd(maxUrlLength, ' ')} ${pr.title}`);
  }

  if (failed.length > 0) {
    console.log(`Unable to process: ${failed.length} pull requests(s)`);
    for (const pr of failed) {
      console.log(`  ${pr.html_url.padEnd(maxUrlLength, ' ')} ${pr.title}`);
    }
  }

  if (error) {
    console.log(`Error when processing PRs: ${error}`);
  }
}
