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
import {GitHub, GitHubRepository, PullRequest, Issue} from './github';

export interface PRIteratorOptions extends IteratorOptions {
  processMethod: (
    repository: GitHubRepository,
    item: PullRequest,
    cli: meow.Result<typeof meowFlags>
  ) => Promise<boolean>;
}

export interface IssueIteratorOptions extends IteratorOptions {
  processMethod: (
    repository: GitHubRepository,
    item: Issue,
    cli: meow.Result<typeof meowFlags>
  ) => Promise<boolean>;
}

export interface IteratorOptions {
  commandName: string; // approve
  commandNamePastTense: string; // approved
  commandActive: string; // approving
  commandDesc: string;
  additionalFlags?: string[];
}

/**
 * Main function. Iterates pull requests or issues in the repositories of the
 * given organization matching given filters. Organization, filters, and GitHub
 * token should be given in the configuration file.
 * @param {string[]} args Command line arguments.
 */
async function process(
  cli: meow.Result<typeof meowFlags>,
  options: PRIteratorOptions | IssueIteratorOptions,
  processIssues = false
) {
  if (
    !cli.flags.title &&
    !cli.flags.branch &&
    !cli.flags.body &&
    !cli.flags.label
  ) {
    console.log(
      `Usage: repo ${
        options.commandName
      } [--branch branch] [--title title] [--body body] [--label label] ${options?.additionalFlags?.join(
        ' '
      )}`
    );
    console.log(
      'Either branch name, body, label, or title regex must present.'
    );
    console.log(options.commandDesc);
    return;
  }

  const concurrency = cli.flags.concurrency
    ? Number(cli.flags.concurrency)
    : 15;
  const config = await getConfig();
  const github = new GitHub(config);
  const regex = new RegExp((cli.flags.title as string) || '.*');
  const bodyRe = new RegExp((cli.flags.body as string) || '.*');
  const repos = await github.getRepositories();
  const successful: Issue[] = [];
  const failed: Issue[] = [];
  let error: string | undefined;
  let processed = 0;
  let scanned = 0;
  let items = new Array<{repo: GitHubRepository; item: PullRequest | Issue}>();

  const orb1 = ora(
    `[${scanned}/${repos.length}] Scanning repos for ${
      processIssues ? 'issues' : 'PR'
    }s`
  ).start();

  // Concurrently find all PRs or issues in all relevant repositories
  const q = new Q({concurrency});
  q.addAll(
    repos.map(repo => {
      return async () => {
        try {
          let localItems;
          if (processIssues) {
            localItems = await repo.listIssues();
          } else {
            localItems = await repo.listPullRequests();
          }
          items.push(
            ...localItems.map(item => {
              return {repo, item};
            })
          );
          scanned++;
          orb1.text = `[${scanned}/${repos.length}] Scanning repos for PRs`;
        } catch (err) {
          error = `cannot list open ${
            processIssues ? 'issue' : 'PR'
          }s: ${err.toString()}`;
        }
      };
    })
  );
  await q.onIdle();

  // Filter the list of PRs or Issues to ones who match the PR title and/or the branch name
  items = items.filter(itemSet => itemSet.item.title.match(regex));
  if (cli.flags.branch) {
    console.log(`Branch scan: ${cli.flags.branch}`);
    items = items.filter(itemSet => {
      const pr = itemSet.item as PullRequest;
      return new RegExp(cli.flags.branch as string).test(pr.head.ref);
    });
  }
  if (cli.flags.label) {
    console.log(`Label scan: ${cli.flags.label}`);
    items = items.filter(itemSet => {
      const pr = itemSet.item as PullRequest;
      return pr.labels.some(label => {
        return new RegExp(cli.flags.label as string).test(label.name);
      });
    });
  }
  if (cli.flags.body) {
    items = items.filter(itemSet => {
      if (!itemSet.item.body) return false;
      else return itemSet.item.body.match(bodyRe);
    });
  }
  if (cli.flags.author) {
    items = items.filter(
      itemSet => itemSet.item.user.login === cli.flags.author
    );
  }
  orb1.succeed(
    `[${scanned}/${repos.length}] repositories scanned, ${
      items.length
    } matching ${processIssues ? 'issue' : 'PR'}s found`
  );

  // Concurrently process each relevant PR or Issue
  const orb2 = ora(
    `[${processed}/${items.length}] ${options.commandNamePastTense}`
  ).start();
  q.addAll(
    items.map(itemSet => {
      return async () => {
        const title = itemSet.item.title!;
        if (title.match(regex)) {
          orb2.text = `[${processed}/${items.length}] ${
            options.commandActive
          } ${processIssues ? 'issue' : 'PR'}s`;
          let result;
          // By setting the process issues flag, the iterator can be made to
          // process a list of issues rather than PR:
          if (processIssues) {
            const opts = options as IssueIteratorOptions;
            result = await opts.processMethod(
              itemSet.repo,
              itemSet.item as Issue,
              cli
            );
          } else {
            const opts = options as PRIteratorOptions;
            result = await opts.processMethod(
              itemSet.repo,
              itemSet.item as PullRequest,
              cli
            );
          }
          if (result) {
            successful.push(itemSet.item);
          } else {
            failed.push(itemSet.item);
          }
          processed++;
          orb2.text = `[${processed}/${items.length}] ${
            options.commandActive
          } ${processIssues ? 'issue' : 'PR'}s`;
        }
      };
    })
  );
  await q.onIdle();

  orb2.succeed(
    `[${processed}/${items.length}] ${processIssues ? 'issue' : 'PR'}s ${
      options.commandNamePastTense
    }`
  );

  // Pretty-print as a table
  const maxUrlLength = items
    .map(item => item.item)
    .reduce(
      (maxLength: number, item: Issue | PullRequest) =>
        item.html_url.length > maxLength ? item.html_url.length : maxLength,
      0
    );

  console.log(
    `Successfully processed: ${successful.length} ${
      processIssues ? 'issue' : 'PR'
    }s`
  );
  for (const item of successful) {
    console.log(`  ${item.html_url.padEnd(maxUrlLength, ' ')} ${item.title}`);
  }

  if (failed.length > 0) {
    console.log(
      `Unable to process: ${failed.length} ${processIssues ? 'issue' : 'PR'}(s)`
    );
    for (const item of failed) {
      console.log(`  ${item.html_url.padEnd(maxUrlLength, ' ')} ${item.title}`);
    }
  }

  if (error) {
    console.log(
      `Error when processing ${processIssues ? 'issue' : 'PR'}s: ${error}`
    );
  }
}

// Shorthand for processing list of PRs:
export async function processPRs(
  cli: meow.Result<typeof meowFlags>,
  options: PRIteratorOptions | IssueIteratorOptions
) {
  return process(cli, options, false);
}

// Shorthand for processing list of issues:
export async function processIssues(
  cli: meow.Result<typeof meowFlags>,
  options: PRIteratorOptions | IssueIteratorOptions
) {
  return process(cli, options, true);
}
