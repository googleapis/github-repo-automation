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

let title: string;

async function processMethod(repository: GitHubRepository, pr: PullRequest) {
  await repository.renamePullRequest(pr, title);
  return true;
}

export async function rename(cli: meow.Result<meow.AnyFlags>) {
  if (cli.input.length < 2) {
    console.log('New title name must present.');
    return;
  }
  title = cli.input[1];
  console.log(`title: ${title}`);
  return processPRs(cli, {
    commandName: 'rename',
    commandNamePastTense: 'renamed',
    commandActive: 'renaming',
    commandDesc:
      'Will show all open PRs with title matching regex and rename them.',
    processMethod,
  });
}
