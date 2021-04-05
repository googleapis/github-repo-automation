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
 * @fileoverview Updates master branch protection to add/remove admin enforcement
 */

'use strict';

const meow = require('meow');
const {getConfig} = require('../build/src/lib/config.js');
const {GitHub} = require('../build/src/lib/github');

async function main(input) {
  const config = await getConfig();
  const github = new GitHub(config);

  const repos = await github.getRepositories();
  const enforce = input[0] === 'add';
  if (enforce) {
    console.log('adding admin enforcement on branch protection');
  } else {
    console.log('removing admin enforcement on branch protection.');
  }
  for (const repository of repos) {
    console.log(repository.getRepository()['name']);
    await repository.updateEnforceAdmin(enforce);
  }
}

const cli = meow(
  `
	Usage
    $ node update-admin-branch-protection.js remove
    $ node update-admin-branch-protection.js add
`
);

if (cli.input.length < 1) {
  cli.showHelp(-1);
} else {
  main(cli.input).catch(err => {
    console.error(err.toString());
  });
}
