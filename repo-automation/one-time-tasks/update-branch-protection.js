/**
 * @fileoverview Updates master branch protection to remove node7 task from the
 * list of required CI tasks.
 */

'use strict';

const GitHub = require('../lib/github.js');

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
