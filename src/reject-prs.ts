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

import * as meow from 'meow';
import {meowFlags} from './cli';

import {GitHubRepository, PullRequest} from './lib/github';
import {processPRs} from './lib/asyncItemIterator';

async function processMethod(
  repository: GitHubRepository,
  pr: PullRequest,
  cli: meow.Result<typeof meowFlags>
) {
  const ref = pr.head.ref;
  try {
    await repository.closePullRequest(pr);
  } catch (err) {
    console.warn('    cannot close pull request, skipping:', err.toString());
    return false;
  }

  // delete only branches that we own
  if (
    cli.flags.clean &&
    pr.head.repo.owner.login === repository.repository.owner.login
  ) {
    try {
      await repository.deleteBranch(ref);
    } catch (err) {
      console.warn(`    error trying to delete branch ${ref}: ${err}`);
      return false;
    }
  }
  return true;
}

export async function reject(cli: meow.Result<typeof meowFlags>) {
  return processPRs(cli, {
    commandName: 'reject',
    commandActive: 'rejecting',
    commandNamePastTense: 'rejected',
    commandDesc: 'Automatically reject all PRs that match a given filter.',
    additionalFlags: ['[--clean]'],
    processMethod,
  });
}
