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
 * @fileoverview Updates main branch protection to remove node7 task from the
 * list of required CI tasks.
 */

'use strict';

const meow = require('meow');
const {getConfig} = require('../build/src/lib/config.js');
const {GitHub} = require('../build/src/lib/github');

async function main(input) {
  const config = await getConfig();
  const github = new GitHub(config);

  const repos = await github.getRepositories();
  for (const repository of repos) {
    console.log(repository.getRepository()['name']);

    let statusChecks;
    try {
      statusChecks =
        await repository.getRequiredMasterBranchProtectionStatusChecks();
    } catch (err) {
      console.warn('  error getting required status checks:', err.toString());
      continue;
    }

    if (statusChecks === undefined) {
      console.warn('  no status checks set up for this repo, skipping');
      continue;
    }

    const contexts = statusChecks['contexts'];
    if (input[0] === 'remove') {
      const index = contexts.indexOf(input[1]);
      contexts.splice(index, 1);
    } else if (input[0] === 'add') {
      contexts.push(input[1]);
    } else {
      throw Error(`unrecognized command ${input[0]}`);
    }

    try {
      await repository.updateRequiredBaseBranchProtectionStatusChecks(contexts);
    } catch (err) {
      console.warn('  error setting required status checks:', err.toString());
      continue;
    }
  }
}

const cli = meow(
  `
	Usage
    $ node update-branch-protection.js remove "ci/kokoro: node11"
    $ node update-branch-protection.js add "ci/kokoro: node12"
`
);

if (cli.input.length < 2) {
  cli.showHelp(-1);
} else {
  main(cli.input).catch(err => {
    console.error(err.toString());
  });
}
