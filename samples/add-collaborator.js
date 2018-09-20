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
 * @fileoverview Adds a collaborator to all repositories.
 */

'use strict';

const GitHub = require('../build/src/lib/github.js');
const question = require('../build/src/lib/question.js');

/** Main function.
 */
async function main() {
  const username = await question('Enter username to add as collaborator:');
  if (username === undefined || username.match(/^\s*$/)) {
    console.log('Canceling.');
    return;
  }

  let permission = await question(
    'Enter permission level: push, pull, or admin [push]:'
  );
  if (permission === undefined || permission.match(/^\s*$/)) {
    permission = 'push';
  }
  if (!['push', 'pull', 'admin'].includes(permission)) {
    console.log('Incorrect permission entered.');
    return;
  }

  const github = new GitHub();
  await github.init();

  const repos = await github.getRepositories();
  let index = 0;
  for (const repository of repos) {
    console.log(
      `${repository.name}: [.] processing repository (${index} of ${
        repos.length
      } repositories completed)`
    );
    await repository.addCollaborator(username, permission);
    ++index;
  }

  console.log(`${repos.length} repositories completed`);
}

main().catch(err => {
  console.error(err.toString());
});
