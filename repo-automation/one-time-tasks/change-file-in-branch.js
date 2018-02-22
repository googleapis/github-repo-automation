/**
 * @fileoverview Apply a quick fix to CircleCI configuration.
 */

// NOTE: apply patch https://github.com/octokit/rest.js/pull/748.patch manually
// until the pull request is merged and the module is released.

const updateOneFileInBranch = require('../lib/update-file-in-branch.js');

/** Renames incorrectly named yaml reference in the CircleCI config file.
 * @param {string} circleConfigText CircleCI configuration yaml file.
 * @returns {string} Returns updated config file, or undefined if anything is
 * wrong.
 */
function fixCircleConfig(circleConfigText) {
  let newText = circleConfigText.toString().replace(new RegExp('ref_0', 'g'), 'unit_tests');
  if (newText === circleConfigText) {
    return;
  }
  return newText;
}

/** Main function.
 */
async function main() {
  await updateOneFileInBranch({
    path: '.circleci/config.yml',
    patchFunction: fixCircleConfig,
    branch: 'remove-node7-test',
    message: 'chore: rename reference',
  });
}

main();
