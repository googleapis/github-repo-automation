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
import {meowFlags} from './cli';

import {GitHubRepository, PullRequest} from './lib/github';
import {processPRs} from './lib/asyncItemIterator';

async function processMethod(repository: GitHubRepository, pr: PullRequest) {
  const htmlUrl = pr.html_url;
  const baseSha = pr.base.sha;
  const ref = pr.head.ref;

  let latestCommit: {[index: string]: string};
  try {
    latestCommit = await repository.getLatestCommitToBaseBranch();
  } catch (err) {
    console.warn(
      '    cannot get sha of latest commit to the base branch, skipping:',
      err.toString()
    );
    return false;
  }

  const latestMasterSha = latestCommit['sha'];
  if (latestMasterSha !== baseSha) {
    try {
      await repository.updateBranch(ref, repository.baseBranch);
    } catch (err) {
      console.warn(
        `    cannot update branch for PR ${htmlUrl}, skipping:`,
        err.toString()
      );
      return false;
    }
  }

  return true;
}

export async function update(cli: meow.Result<typeof meowFlags>) {
  return processPRs(cli, {
    commandName: 'update',
    commandActive: 'updating',
    commandNamePastTense: 'updated',
    commandDesc:
      'Iterates over all PRs matching the regex, and updates them, to the latest on the base branch.',
    processMethod,
  });
}
