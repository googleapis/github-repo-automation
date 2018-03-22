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
 * @fileoverview Adds nightly builds workflow by copying `test` workflow
 * and tweaking it (removing publish_npm part, change filters).
 */

'use strict';

const path = require('path');
const yaml = require('js-yaml');
const fs = require('fs');
const util = require('util');
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
const updateRepo = require('../lib/update-repo.js');

/** Copies `test` workflow to a `nightly` workflow running every night
 * at 7am UTC.
 * Branch filters are set to `master`.
 * Adds a Python script to detect if the current CI task is a nightly build
 * or not (to be able to remove package-lock.json in case of a nightly build).
 * @param {string} repoPath Path to a cloned repository.
 * @returns {Promise<string[]>} A promise that resolves to a list of filenames
 * to be added or edited, and checked in.
 */
async function process(repoPath) {
  let circleConfigPath = path.join('.circleci', 'config.yml');
  let circleConfigFullPath = path.join(repoPath, circleConfigPath);
  let text = (await readFile(circleConfigFullPath)).toString();
  let config = yaml.load(text);

  let removePackageLock = {
    name: 'Remove package-lock.json if needed.',
    command: `WORKFLOW_NAME=\`python .circleci/get_workflow_name.py\`
echo "Workflow name: $WORKFLOW_NAME"
if [ "$WORKFLOW_NAME" = "nightly" ]; then
  echo "Nightly build detected, removing package-lock.json."
  rm -f package-lock.json samples/package-lock.json
else
  echo "Not a nightly build, skipping this step."
fi
`,
  };

  let unitTestsSteps = config['unit_tests']['steps'];
  delete config['unit_tests'];
  unitTestsSteps.splice(1, 0, {
    run: removePackageLock,
  });

  let jobs = config['jobs'];
  for (let name of Object.keys(jobs)) {
    if (name.match(/^node\d+$/)) {
      jobs[name]['steps'] = unitTestsSteps;
    } else if (name !== 'publish_npm') {
      jobs[name]['steps'].splice(1, 0, {
        run: removePackageLock,
      });
    }
  }

  let testJobs = config['workflows']['tests']['jobs'];
  config['workflows']['nightly'] = {
    triggers: [
      {
        schedule: {
          cron: '0 7 * * *',
          filters: {
            branches: {
              only: 'master',
            },
          },
        },
      },
    ],
    jobs: testJobs,
  };

  let newText = yaml.dump(config);
  newText = newText.replace(/ref_0/g, 'workflow_jobs');
  newText = newText.replace(/ref_1/g, 'unit_tests_steps');
  newText = newText.replace(/ref_2/g, 'remove_package_lock');
  await writeFile(circleConfigFullPath, newText);

  let pythonScriptPath = path.join('.circleci', 'get_workflow_name.py');
  let pythonScriptSourceFolder = '/tmp/source_folder';
  let pythonScript = await readFile(
    path.join(pythonScriptSourceFolder, pythonScriptPath)
  );
  await writeFile(path.join(repoPath, pythonScriptPath), pythonScript);

  return Promise.resolve([pythonScriptPath, circleConfigPath]);
}

/** Main function.
 */
async function main() {
  await updateRepo({
    updateCallback: process,
    branch: 'setup-nightly-build-workflow',
    message: 'chore: setup nighty build in CircleCI',
    comment:
      'Creating a new workflow called `nightly` that will run every night. It will remove `package-lock.json`, then run the build.',
    // reviewers: ['stephenplusplus', 'callmehiphop'],
  });
}

main().catch(err => {
  console.error(err.toString());
});
