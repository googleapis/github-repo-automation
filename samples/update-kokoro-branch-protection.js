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
 * @fileoverview Updates master branch protection to be replaced by Kokoro
 * builds.
 */

'use strict';

const GitHub = require('../build/src/lib/github.js');

const REQUIRED_STATUS_CHECKS = [
  'ci/kokoro: node6',
  'ci/kokoro: node8',
  'ci/kokoro: node10',
  'ci/kokoro: lint',
  'ci/kokoro: System test',
  'ci/kokoro: Samples test',
]

async function main() {
  const github = new GitHub();
  await github.init();

  const repos = await github.getRepositories();
  for (const repository of repos) {
    console.log(repository.getRepository()['name']);

    try {
      await repository.updateRequiredMasterBranchProtectionStatusChecks(
        REQUIRED_STATUS_CHECKS,
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
