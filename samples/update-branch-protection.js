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
 * @fileoverview Updates master branch protection to remove node7 task from the
 * list of required CI tasks.
 */

'use strict';

const GitHub = require('../build/src/lib/github.js');

async function main() {
  const toRemove = 'ci/circleci: node7';

  let github = new GitHub();
  await github.init();

  let repos = await github.getRepositories();
  for (let repository of repos) {
    console.log(repository.getRepository()['name']);

    let statusChecks;
    try {
      statusChecks = await repository.getRequiredMasterBranchProtectionStatusChecks();
    } catch (err) {
      console.warn('  error getting required status checks:', err.toString());
      continue;
    }

    if (statusChecks === undefined) {
      console.warn('  no status checks set up for this repo, skipping');
      continue;
    }

    let contexts = statusChecks['contexts'];
    let index = contexts.indexOf(toRemove);
    contexts.splice(index, 1);

    try {
      await repository.updateRequiredMasterBranchProtectionStatusChecks(
        contexts
      );
    } catch (err) {
      console.warn('  error setting required status checks:', err.toString());
      continue;
    }
  }
}

main().catch(err => {
  console.error(err.toString());
});
