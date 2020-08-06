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
 * greenkeeper enabled, the base branch protected, README links valid, etc.
 */

import {request, GaxiosResponse} from 'gaxios';

import {getConfig} from './lib/config';
import {GitHub, GitHubRepository} from './lib/github';

/**
 * Logs and counts errors and warnings to console with fancy coloring.
 */
class Logger {
  errorCount: number;
  warningCount: number;
  constructor() {
    this.errorCount = 0;
    this.warningCount = 0;
  }

  /**
   * Log error to console.
   * @param {text} Error message.
   */
  error(text: string) {
    ++this.errorCount;
    console.log(text);
  }

  /**
   * Log warning to console.
   * @param {text} Warning message.
   */
  warning(text: string) {
    ++this.warningCount;
    console.log(`\x1b[2m${text}\x1b[0m`);
  }

  /**
   * Log information to console.
   * @param {text} Message.
   */
  info(text: string) {
    console.log(`\x1b[2m${text}\x1b[0m`);
  }
}

/**
 * Checks GitHub base branch protection settings.
 * Logs all errors and warnings.
 * @param {GitHubRepository} repository Repository object.
 * @param {Logger} logger Logger object.
 */
async function checkGithubBaseBranchProtection(
  logger: Logger,
  repository: GitHubRepository
) {
  let getBranchRes;
  try {
    getBranchRes = await repository.getBranch(repository.baseBranch);
  } catch (err) {
    logger.error(
      `${repository.name}: [!] cannot fetch branch information, no access?`
    );
    return;
  }
  if (!getBranchRes.protected) {
    logger.error(
      `${repository.name}: [!] branch protection for ${repository.baseBranch} branch is disabled`
    );
    return;
  }

  let response;
  try {
    response = await repository.getRequiredBaseBranchProtection();
  } catch (err) {
    logger.error(
      `${repository.name}: [!] cannot fetch branch protection settings, no access?`
    );
    return;
  }
  if (response['required_pull_request_reviews'] === undefined) {
    logger.error(
      `${repository.name}: [!] branch protection for ${repository.baseBranch} branch - pull request reviews are not required`
    );
  }

  if (response['required_status_checks'] !== undefined) {
    const requiredStatusChecks = [
      'ci/kokoro: node6',
      'ci/kokoro: node8',
      'ci/kokoro: node10',
      'ci/kokoro: lint',
      'ci/kokoro: Samples test',
      'ci/kokoro: System test',
    ];
    for (const check of requiredStatusChecks) {
      let enabled = false;
      for (const enabledCheck of response['required_status_checks'][
        'contexts'
      ]) {
        if (enabledCheck === check) {
          enabled = true;
        }
      }
      if (!enabled) {
        logger.error(
          `${repository.name}: [!] branch protection for ${repository.baseBranch} branch - status check ${check} is not required`
        );
      }
    }
  } else {
    logger.error(
      `${repository.name}: [!] branch protection for ${repository.baseBranch} branch - status checks are not enabled`
    );
  }
}

/**
 * Checks if Renovate is enabled for GitHub repository.
 * Logs all errors and warnings.
 * @param {GitHubRepository} repository Repository object.
 * @param {Logger} logger Logger object.
 */
async function checkRenovate(logger: Logger, repository: GitHubRepository) {
  const response = await repository.listPullRequests('closed');

  let renovateFound = false;
  for (const pullRequest of response) {
    if (pullRequest.user!.login === 'renovate[bot]') {
      renovateFound = true;
      break;
    }
  }

  if (!renovateFound) {
    logger.error(`${repository.name}: [!] GreenKeeper is probably not enabled`);
  }
}

/**
 * Checks that the version of the dependency in samples/package.json
 * matches the version of the package defined in package.json.
 * E.g. if the package is "@google-cloud/example" version "1.2.3",
 * samples must depend on exactly "@google-cloud/example": "1.2.3".
 * Logs all errors and warnings.
 * @param {GitHubRepository} repository Repository object.
 * @param {Logger} logger Logger object.
 */
async function checkSamplesPackageDependency(
  logger: Logger,
  repository: GitHubRepository
) {
  let response;
  try {
    response = await request({
      url: `https://raw.githubusercontent.com/${repository.organization}/${repository.name}/${repository.repository.default_branch}/package.json`,
    });
  } catch (err) {
    logger.error(
      `${repository.name}: [!] cannot download package.json: ${err.toString()}`
    );
    return;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const packageJson: any = response.data;
  try {
    response = await request({
      url: `https://raw.githubusercontent.com/${repository.organization}/${repository.name}/${repository.repository.default_branch}/samples/package.json`,
    });
  } catch (err) {
    logger.warning(`${repository.name}: [!] no samples/package.json.`);
    return;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const samplesPackageJson: any = response.data;
  try {
    const mainVersion = packageJson['version'];
    const mainName = packageJson['name'];
    const samplesDependency = samplesPackageJson['dependencies'][mainName];
    const regex = '^[^]?' + mainVersion.replace(/\./g, '.') + '$'; // 1.12.3 ==> ^[^]?1\.12\.3$
    if (!samplesDependency.match(regex)) {
      logger.error(
        `${repository.name}: [!] main package version ${mainVersion} does not match samples dependency ${samplesDependency}`
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

/**
 * Checks if README.md contains any broken links.
 * Logs all errors and warnings.
 * @param {Logger} logger Logger object.
 * @param {GitHubRepository} repository Repository object.
 */
async function checkReadmeLinks(logger: Logger, repository: GitHubRepository) {
  let response: GaxiosResponse<string>;
  try {
    response = await request<string>({
      url: `https://raw.githubusercontent.com/${repository.organization}/${repository.name}/${repository.repository.default_branch}/README.md`,
    });
  } catch (err) {
    logger.error(
      `${repository.name}: [!] cannot download README.md: ${err.toString()}`
    );
    return;
  }
  const readme = response.data;

  const links: string[] = [];
  const reflinksRegex = /\[[^[\]]*?\]: (http.*)/g;
  for (;;) {
    const reflinksMatch = reflinksRegex.exec(readme);
    if (reflinksMatch === null) {
      break;
    }
    links.push(reflinksMatch[1]);
  }

  const linksRegex = /\[[^[\]]*?\]\((http.*?)\)/g;
  for (;;) {
    const linksMatch = linksRegex.exec(readme);
    if (linksMatch === null) {
      break;
    }
    links.push(linksMatch[1]);
  }

  for (const link of links) {
    const regex = /^(https?):\/\/([^/]+)(\/.*?)?(?:#.*)?$/;
    const match = regex.exec(link);
    if (!match) {
      logger.error(
        `${repository.name}: [!] README.md has link ${link} which does not look valid`
      );
      continue;
    }

    try {
      await request({url: link});
    } catch (err) {
      logger.error(
        `${repository.name}: [!] README.md has link ${link} which does not work`
      );
    }
  }
}

/**
 * Iterates over all repositories according to the configuration file and runs
 * all checks for each of them. Logs errors and warnings.
 * @param {Logger} logger Logger object.
 */
async function checkAllRepositories(logger: Logger) {
  const config = await getConfig();
  const github = new GitHub(config);
  const repos = await github.getRepositories();
  let index = 0;
  for (const repository of repos) {
    logger.info(
      `${repository.name}: [.] checking repository (${index} of ${repos.length} repositories completed)`
    );

    const errorCounter = logger.errorCount;
    await checkGithubBaseBranchProtection(logger, repository);
    await checkRenovate(logger, repository);
    await checkSamplesPackageDependency(logger, repository);
    await checkReadmeLinks(logger, repository);

    const foundErrors = logger.errorCount - errorCounter;
    logger.info(
      `${repository.name}: [.] ${foundErrors === 0 ? 'no' : foundErrors} error${
        foundErrors === 1 ? '' : 's'
      } found`
    );

    ++index;
  }
  logger.info(`${repos.length} repositories completed`);
}

/**
 * Main function.
 */
export async function main() {
  const logger = new Logger();
  await checkAllRepositories(logger);
  process.exitCode = logger.errorCount;
  logger.info(`Total errors: ${logger.errorCount}`);
  logger.info(`Total warnings: ${logger.warningCount}`);
}
