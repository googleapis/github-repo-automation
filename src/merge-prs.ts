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

'use strict';

import {GitHubRepository, PullRequest} from './lib/github';
import * as meow from 'meow';
import {process} from './lib/prIterator';


async function processMethod(repository: GitHubRepository, pr: PullRequest) {
  const title = pr.title;
  const htmlUrl = pr.html_url;
  const author = pr.user.login;
  const baseSha = pr.base.sha;
  const ref = pr.head.ref;

  console.log(`  [${author}] ${htmlUrl}: ${title}`);

  let latestCommit: {[index: string]: string};
  try {
    latestCommit = await repository.getLatestCommitToMaster();
  } catch (err) {
    console.warn(
        '    cannot get sha of latest commit to master, skipping:',
        err.toString());
    return false;
  }
  const latestMasterSha = latestCommit['sha'];
  if (latestMasterSha !== baseSha) {
    try {
      await repository.updateBranch(ref, 'master');
      console.log(
          'You might not be able to merge immediately because CI tasks will take some time.');
    } catch (err) {
      console.warn(
          `    cannot update branch for PR ${htmlUrl}, skipping:`,
          err.toString());
      return false;
    }
  }

  try {
    await repository.mergePullRequest(pr);
    console.log('    merged!');
    try {
      await repository.deleteBranch(ref);
      console.log('    branch deleted!');
    } catch (err) {
      console.warn(`    error trying to delete branch ${ref}: ${err}`);
      return false;
    }
  } catch (err) {
    console.warn(`\t error trying to merge PR ${htmlUrl}: ${err}`);
    return false;
  }

  return true;
}

export async function merge(cli: meow.Result) {
  return process(cli, {
    processMethod,
    commandName: 'merge',
    commandDesc:
        'Will show all open PRs with title matching regex and allow to merge them.'
  });
}
