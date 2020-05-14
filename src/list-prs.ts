// Copyright 2020 Google LLC
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
import {process} from './lib/asyncItemIterator';
/* eslint-disable @typescript-eslint/no-unused-vars */
async function processMethod(repository: GitHubRepository, pr: PullRequest) {
  return true;
}

export async function list(cli: meow.Result<typeof meowFlags>) {
  return process(cli, {
    commandName: 'list',
    commandNamePastTense: 'listed',
    commandActive: 'listing', // :)
    commandDesc: 'Will list all open PRs with title matching regex.',
    processMethod,
  });
}
