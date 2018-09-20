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
 * @fileoverview Apply a quick fix to CircleCI configuration.
 */

'use strict';

const updateFileInBranch = require('../build/src/lib/update-file-in-branch.js');

/** Renames incorrectly named yaml reference in the CircleCI config file.
 * @param {string} circleConfigText CircleCI configuration yaml file.
 * @returns {string} Returns updated config file, or undefined if anything is
 * wrong.
 */
function fixCircleConfig(circleConfigText) {
  const newText = circleConfigText
    .toString()
    .replace(new RegExp('ref_0', 'g'), 'unit_tests');
  if (newText === circleConfigText) {
    return;
  }
  return newText;
}

/** Main function.
 */
async function main() {
  await updateFileInBranch({
    path: '.circleci/config.yml',
    patchFunction: fixCircleConfig,
    branch: 'remove-node7-test',
    message: 'chore: rename reference',
  });
}

main().catch(err => {
  console.error(err.toString());
});
