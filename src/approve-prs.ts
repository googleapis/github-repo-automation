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
import {meowFlags} from './cli';

import {GitHubRepository, PullRequest} from './lib/github';
import {processPRs} from './lib/asyncItemIterator';

async function processMethod(repository: GitHubRepository, pr: PullRequest) {
  try {
    await repository.approvePullRequest(pr);
  } catch (err) {
    console.warn(
      `    error trying to approve pull request ${pr.html_url}: ${err}`
    );
    return false;
  }
  return true;
}

export async function approve(cli: meow.Result<typeof meowFlags>) {
  return processPRs(cli, {
    commandName: 'approve',
    commandNamePastTense: 'approved',
    commandActive: 'approving',
    commandDesc:
      'Will show all open PRs with title matching regex and approve them.',
    processMethod,
  });
}
