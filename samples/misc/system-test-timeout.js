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
 * @fileoverview Update system test timeout in `package.json` in all configured
 * repositories.
 */

'use strict';

const updateFile = require('../../build/src/lib/update-file.js');

/** Updates system test script in package.json and sets timeout to 600000 (10
 * minutes).
 */
function applyFix(packageJson) {
  const json = JSON.parse(packageJson);
  const systemTestCmd = json['scripts']['system-test'];
  if (systemTestCmd === undefined) {
    return undefined;
  }
  const newSystemTestCmd = systemTestCmd.replace(
    /--timeout\s+\d+|--no-timeouts/,
    '--timeout 600000'
  );
  if (newSystemTestCmd === systemTestCmd) {
    return undefined;
  }
  json['scripts']['system-test'] = newSystemTestCmd;
  return JSON.stringify(json, null, '  ') + '\n';
}

/** Main function.
 */
async function main() {
  await updateFile({
    path: 'package.json',
    patchFunction: applyFix,
    branch: 'system-test-timeout',
    message: 'chore: timeout for system test',
    comment: `Set timeout for all system tests to some big (but limited) value. 10 minutes per test is probably enough.

This is an automated PR prepared using [github-repo-automation](https://github.com/googleapis/github-repo-automation).
`,
    reviewers: ['stephenplusplus', 'callmehiphop'],
  });
}

main().catch(err => {
  console.error(err.toString());
});
