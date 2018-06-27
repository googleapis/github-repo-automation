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
 * @fileoverview Verifies that the repository is compliant: CI running,
 * greenkeeper enabled, master branch protected, README links valid, etc.
 */

'use strict';

import axios from 'axios';
const GitHub = require('./lib/github.js');
const CircleCI = require('./lib/circleci.js');

/** Logs and counts errors and warnings to console with fancy coloring.
 */
class Logger {
  errorCount: number;
  warningCount: number;
  constructor() {
    this.errorCount = 0;
    this.warningCount = 0;
  }

  /** Log error to console.
   * @param {string} Error message.
   */
  error(string) {
    ++this.errorCount;
    console.log(string);
  }

  /** Log warning to console.
   * @param {string} Warning message.
   */
  warning(string) {
    ++this.warningCount;
    console.log(`\x1b[2m${string}\x1b[0m`);
  }

  /** Log information to console.
   * @param {string} Message.
   */
  info(string) {
    console.log(`\x1b[2m${string}\x1b[0m`);
  }
}

/** Checks GitHub master branch protection settings.
 * Logs all errors and warnings.
 * @param {GitHubRepository} repository Repository object.
 * @param {Logger} logger Logger object.
 */
async function checkGithubMasterBranchProtection(logger, repository) {
  let response = await repository.getBranch('master');
  if (!response['protected']) {
    logger.error(
      `${repository.name}: [!] branch protection for master branch is disabled`
    );
    return;
  }

  response = await repository.getRequiredMasterBranchProtection();
  if (response['required_pull_request_reviews'] === undefined) {
    logger.error(
      `${
        repository.name
      }: [!] branch protection for master branch - pull request reviews are not required`
    );
  }

  if (response['required_status_checks'] !== undefined) {
    let requiredStatusChecks = [
      'ci/circleci: node4',
      'ci/circleci: node6',
      'ci/circleci: node8',
      'ci/circleci: node9',
    ];
    for (let check of requiredStatusChecks) {
      let enabled = false;
      for (let enabledCheck of response['required_status_checks']['contexts']) {
        if (enabledCheck === check) {
          enabled = true;
        }
      }
      if (!enabled) {
        logger.error(
          `${
            repository.name
          }: [!] branch protection for master branch - status check ${check} is not required`
        );
      }
    }
  } else {
    logger.error(
      `${
        repository.name
      }: [!] branch protection for master branch - status checks are not enabled`
    );
  }
}

/** Checks if Greenkeeper is enabled for GitHub repository.
 * Logs all errors and warnings.
 * @param {GitHubRepository} repository Repository object.
 * @param {Logger} logger Logger object.
 */
async function checkGreenkeeper(logger, repository) {
  let response = await repository.listPullRequests('closed');

  let greenkeeperFound = false;
  for (let pullRequest of response) {
    if (pullRequest['user']['login'] === 'greenkeeper[bot]') {
      greenkeeperFound = true;
      break;
    }
  }

  if (!greenkeeperFound) {
    logger.error(`${repository.name}: [!] GreenKeeper is probably not enabled`);
  }
}

/** Checks if CircleCI is enabled for the repository, and how many recent builds
 * failed on master branch.
 * Logs all errors and warnings.
 * @param {Logger} logger Logger object.
 * @param {CircleCI} circleci Initialized CircleCI object.
 * @param {GitHubRepository} repository Repository object.
 */
async function checkCircleSettings(logger, circleci, repository) {
  try {
    let recentBuilds = await circleci.getBuildsForProject(repository.name);
    let recentBuildsMaster = recentBuilds.filter(b => b['branch'] === 'master');
    let failedCount = 0;
    for (let recentBuild of recentBuildsMaster) {
      if (recentBuild['outcome'] === 'failed') {
        ++failedCount;
      }
    }
    if (failedCount > 0) {
      if (failedCount === recentBuildsMaster.length) {
        logger.error(
          `${
            repository.name
          }: [!] all ${failedCount} recent circleci build(s) for master branch failed`
        );
      } else {
        logger.warning(
          `${
            repository.name
          }: [w] circleci builds for master branch: ${failedCount} of ${
            recentBuildsMaster.length
          } recent build(s) failed`
        );
      }
    }
  } catch (err) {
    logger.error(
      `${repository.name}: [!] circleci builds for master branch - not found`
    );
  }
}

/** Checks that the version of the dependency in samples/package.json
 * matches the version of the package defined in package.json.
 * E.g. if the package is "@google-cloud/example" version "1.2.3",
 * samples must depend on exactly "@google-cloud/example": "1.2.3".
 * Logs all errors and warnings.
 * @param {GitHubRepository} repository Repository object.
 * @param {Logger} logger Logger object.
 */
async function checkSamplesPackageDependency(logger, repository) {
  let response;
  try {
    response = await axios.get(
      `https://raw.githubusercontent.com/${repository.organization}/${
        repository.name
      }/master/package.json`
    );
  } catch (err) {
    logger.error(
      `${repository.name}: [!] cannot download package.json: ${err.toString()}`
    );
    return;
  }
  let packageJson = response.data;
  try {
    response = await axios.get(
      `https://raw.githubusercontent.com/${repository.organization}/${
        repository.name
      }/master/samples/package.json`
    );
  } catch (err) {
    logger.warning(`${repository.name}: [!] no samples/package.json.`);
    return;
  }
  let samplesPackageJson = response.data;
  try {
    let mainVersion = packageJson['version'];
    let mainName = packageJson['name'];
    let samplesDependency = samplesPackageJson['dependencies'][mainName];
    if (samplesDependency !== mainVersion) {
      logger.error(
        `${
          repository.name
        }: [!] main package version ${mainVersion} does not match samples dependency ${samplesDependency}`
      );
    }
  } catch (err) {
    logger.error(
      `${
        repository.name
      }: cannot check samples package dependencies: ${err.toString()}`
    );
  }
}

/** Checks if README.md contains any broken links.
 * Logs all errors and warnings.
 * @param {Logger} logger Logger object.
 * @param {GitHubRepository} repository Repository object.
 */
async function checkReadmeLinks(logger, repository) {
  let response;
  try {
    response = await axios.get(
      `https://raw.githubusercontent.com/${repository.organization}/${
        repository.name
      }/master/README.md`
    );
  } catch (err) {
    logger.error(
      `${repository.name}: [!] cannot download README.md: ${err.toString()}`
    );
    return;
  }
  let readme = response.data;

  let links: string[] = [];
  let reflinksRegex = /\[[^[\]]*?\]: (http.*)/g;
  let reflinksMatch;
  while (null !== (reflinksMatch = reflinksRegex.exec(readme))) {
    links.push(reflinksMatch[1]);
  }

  let linksRegex = /\[[^[\]]*?\]\((http.*?)\)/g;
  let linksMatch;
  while (null !== (linksMatch = linksRegex.exec(readme))) {
    links.push(linksMatch[1]);
  }

  for (let link of links) {
    let regex = /^(https?):\/\/([^/]+)(\/.*?)?(?:#.*)?$/;
    let match = regex.exec(link);
    if (!match) {
      logger.error(
        `${
          repository.name
        }: [!] README.md has link ${link} which does not look valid`
      );
      continue;
    }

    try {
      await axios.get(link);
    } catch (err) {
      logger.error(
        `${repository.name}: [!] README.md has link ${link} which does not work`
      );
    }
  }
}

/** Iterates over all repositories according to the configuration file and runs
 * all checks for each of them. Logs errors and warnings.
 * @param {Logger} logger Logger object.
 */
async function checkAllRepositories(logger) {
  let github = new GitHub();
  await github.init();

  let circleci = new CircleCI();
  await circleci.init();

  let repos = await github.getRepositories();
  let index = 0;
  for (let repository of repos) {
    logger.info(
      `${repository.name}: [.] checking repository (${index} of ${
        repos.length
      } repositories completed)`
    );

    let errorCounter = logger.errorCount;
    await checkGithubMasterBranchProtection(logger, repository);
    await checkGreenkeeper(logger, repository);
    await checkCircleSettings(logger, circleci, repository);
    await checkSamplesPackageDependency(logger, repository);
    await checkReadmeLinks(logger, repository);

    let foundErrors = logger.errorCount - errorCounter;
    logger.info(
      `${repository.name}: [.] ${foundErrors === 0 ? 'no' : foundErrors} error${
        foundErrors === 1 ? '' : 's'
      } found`
    );

    ++index;
  }
  logger.info(`${repos.length} repositories completed`);
}

/** Main function.
 */
async function main() {
  let logger = new Logger();
  await checkAllRepositories(logger);
  process.exitCode = logger.errorCount;
  logger.info(`Total errors: ${logger.errorCount}`);
  logger.info(`Total warnings: ${logger.warningCount}`);
}

module.exports = {
  main,
};
