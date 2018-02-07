/**
 * @fileoverview Verifies that the repository is compliant: CI running,
 * greenkeeper enabled, master branch protected, README links valid, etc.
 */

'use strict';

const fs = require('fs');
const http = require('http');
const https = require('https');
const util = require('util');

const readFile = util.promisify(fs.readFile);

// Paths to files with usernames and tokens
const githubUsernameFile = `${process.env.HOME}/github-username`;
const githubTokenFile = `${process.env.HOME}/github-token`;
const circleTokenFile = `${process.env.HOME}/circleci-token`;

const githubOrg = 'googleapis';
const githubRepoNameRegex = /^nodejs-/;

function logError(string) {
  if (logError.errorCounter === undefined) {
    logError.errorCounter = 0;
  }
  ++logError.errorCounter;
  console.log(string);
}

function logWarning(string) {
  console.log(`\x1b[2m${string}\x1b[0m`);
}

function logInfo(string) {
  console.log(`\x1b[2m${string}\x1b[0m`);
}

async function readTokenFromFile(filename) {
  let contents = await readFile(filename);
  let replaced = contents.toString().replace(/\n/, '');
  if (replaced.match(/\n/)) {
    throw new Error(
      `Token file ${filename} is not supposed to have more than one line`
    );
  }
  return replaced;
}

async function httpRequest(
  authString,
  method,
  hostname,
  path,
  parameters,
  accept
) {
  let githubUsername = await readTokenFromFile(githubUsernameFile);
  const options = {
    hostname,
    path,
    method,
    port: 80,
    headers: {
      'User-Agent': `${githubUsername}-${process.argv0}`,
      'Content-Type': 'application/json',
    },
  };
  if (authString !== undefined) {
    options['headers']['Authorization'] =
      'Basic ' + Buffer.from(authString).toString('base64');
  }
  if (accept !== undefined) {
    options['headers']['Accept'] = accept;
  }
  return new Promise((fulfill, reject) => {
    let request = http.request(options, result => {
      const {statusCode} = result;
      if (statusCode >= 400) {
        reject(
          new Error(
            `HTTP status code ${statusCode} received trying to ${method} http://${hostname}${path}`
          )
        );
      }
      result.setEncoding('utf8');
      let body = '';
      result.on('data', data => {
        body += data;
      });
      result.on('end', () => {
        fulfill(body);
      });
    });
    request.on('error', reject);
    if (parameters !== undefined) {
      request.write(JSON.stringify(parameters));
    }
    request.end();
  });
}

async function httpsRequest(
  authString,
  method,
  hostname,
  path,
  parameters,
  accept
) {
  let githubUsername = await readTokenFromFile(githubUsernameFile);
  const options = {
    hostname,
    path,
    method,
    port: 443,
    headers: {
      'User-Agent': `${githubUsername}-${process.argv0}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  };
  if (authString !== undefined) {
    options['headers']['Authorization'] =
      'Basic ' + Buffer.from(authString).toString('base64');
  }
  if (accept !== undefined) {
    options['headers']['Accept'] = accept;
  }
  return new Promise((fulfill, reject) => {
    let request = https.request(options, result => {
      const {statusCode} = result;
      if (statusCode >= 400) {
        reject(
          new Error(
            `HTTP status code ${statusCode} received trying to ${method} https://${hostname}${path}`
          )
        );
      }
      result.setEncoding('utf8');
      let body = '';
      result.on('data', data => {
        body += data;
      });
      result.on('end', () => {
        fulfill(body);
      });
    });
    request.on('error', reject);
    if (parameters !== undefined) {
      request.write(JSON.stringify(parameters));
    }
    request.end();
  });
}

async function githubRequest(method, path, parameters, accept) {
  let githubUsername = await readTokenFromFile(githubUsernameFile);
  let githubToken = await readTokenFromFile(githubTokenFile);
  let githubAuthString = `${githubUsername}:${githubToken}`;
  accept = accept || 'application/vnd.github.v3+json';
  let response = await httpsRequest(
    githubAuthString,
    method,
    'api.github.com',
    path,
    parameters,
    accept
  );
  return JSON.parse(response);
}

async function getRepoSettings(repository) {
  let path = `/repos/${repository}`;
  let response = await githubRequest('GET', path);

  return response;
}

async function checkGithubBranchProtection(repository, branch) {
  let path = `/repos/${repository}/branches/${branch}`;
  let response = await githubRequest('GET', path);
  if (!response['protected']) {
    logError(`${repository}: [!] branch protection for ${branch} is disabled`);
    return;
  }

  path = `/repos/${repository}/branches/${branch}/protection`;
  response = await githubRequest('GET', path);

  if (response['required_pull_request_reviews'] === undefined) {
    logError(
      `${repository}: [!] branch protection for ${branch} - pull request reviews are not required`
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
        logError(
          `${repository}: [!] branch protection for ${branch} - status check ${check} is not required`
        );
      }
    }
  } else {
    logError(
      `${repository}: [!] branch protection for ${branch} - status checks are not enabled`
    );
  }
}

async function checkGreenkeeper(repository) {
  let path = `/repos/${repository}/pulls?state=closed`;
  let response = await githubRequest('GET', path);

  let greenkeeperFound = false;
  for (let pullRequest of response) {
    if (pullRequest['user']['login'] === 'greenkeeper[bot]') {
      greenkeeperFound = true;
      break;
    }
  }

  if (!greenkeeperFound) {
    logError(`${repository}: [!] GreenKeeper is probably not enabled`);
  }
}

async function checkCircleSettings(repository, branch) {
  let circleToken = await readTokenFromFile(circleTokenFile);
  let path = `/api/v1.1/projects?circle-token=${circleToken}`;
  let response = await httpsRequest(
    undefined,
    'GET',
    'circleci.com',
    path,
    undefined,
    'application/json'
  );
  let projects = JSON.parse(response);
  for (let project of projects) {
    if (project['vcs_url'] === `https://github.com/${repository}`) {
      try {
        let recentList = project['branches'][branch]['recent_builds'];
        let failedCount = 0;
        for (let recentBuild of recentList) {
          if (recentBuild['outcome'] === 'failed') {
            ++failedCount;
          }
        }
        if (failedCount > 0) {
          if (failedCount === recentList.length) {
            logError(
              `${repository}: [!] all ${failedCount} recent circleci build(s) for ${branch} failed`
            );
          } else {
            logWarning(
              `${repository}: [w] circleci builds for ${branch}: ${failedCount} of ${
                recentList.length
              } recent build(s) failed`
            );
          }
        }
      } catch (err) {
        logError(
          `${repository}: [!] circleci builds for ${branch} - not found`
        );
      }
    }
  }
}

async function checkReadmeLinks(repository, branch) {
  let path = `/${repository}/${branch}/README.md`;
  let readme = await httpsRequest(
    undefined,
    'GET',
    'raw.githubusercontent.com',
    path,
    undefined
  );

  let links = [];
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
      logError(
        `${repository}: [!] README.md has link ${link} which does not look valid`
      );
      continue;
    }

    let protocol = match[1];
    let hostname = match[2];
    let path = match[3] || '/';
    try {
      if (protocol === 'http') {
        await httpRequest(undefined, 'GET', hostname, path, undefined, '*/*');
      } else if (protocol === 'https') {
        await httpsRequest(undefined, 'GET', hostname, path, undefined, '*/*');
      }
    } catch (err) {
      logError(`${repository}: [!] README.md has link ${link} which does not work`);
    }
  }
}

async function checkRepository(repository) {
  let repoSettings = await getRepoSettings(repository);
  let defaultBranch = repoSettings['default_branch'];
  await checkGithubBranchProtection(repository, defaultBranch);
  await checkGreenkeeper(repository);
  await checkCircleSettings(repository, defaultBranch);
  await checkReadmeLinks(repository, defaultBranch);
}

async function checkAllRepositories(organization) {
  let path = `/orgs/${organization}/repos?per_page=100`;
  // note: paging might be required

  let repoNames = [];
  let response = await githubRequest('GET', path);
  for (let repo of response) {
    if (repo['name'].match(githubRepoNameRegex) && !repo['private']) {
      repoNames.push(`${organization}/${repo['name']}`);
    }
  }

  let errorCounter = 0;
  for (let index in repoNames) {
    let repository = repoNames[index];
    logInfo(
      `${repository}: [.] checking repository (${index} of ${
        repoNames.length
      } repositories completed)`
    );
    await checkRepository(repository);
    let foundErrors = (logError.errorCounter || 0) - errorCounter;
    errorCounter += foundErrors;
    logInfo(
      `${repository}: [.] ${foundErrors === 0 ? 'no' : foundErrors} error${
        foundErrors === 1 ? '' : 's'
      } found`
    );
  }
  logInfo(`${repoNames.length} repositories completed`);
}

async function main() {
  await checkAllRepositories(githubOrg);
  let errorCounter = logError.errorCounter || 0;
  process.exitCode = errorCounter;
  logInfo(`Total errors found: ${errorCounter}`);
}

main();
