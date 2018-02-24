/**
 * @fileoverview Wraps some octokit GitHub API calls.
 */

'use strict';

const Config = require('./config.js');
const axios = require('axios');

/** Wraps some CircleCI API calls.
 */
class CircleCI {
  /** Reads configuration file and sets up GitHub authentication.
   * @param {string} configFileName Path to configuration yaml file.
   */
  async init(configFilename) {
    let config = new Config(configFilename);
    await config.init();

    this.circleToken = config.get('auth')['circleci-token'];
    this.config = config;
  }

  /** List all projects enabled in CircleCI for the given organization,
   * matching the regex (organization and regex are set in the configuration
   * file).
   * @returns {Object[]} Projects, as returned by CircleCI API.
   */
  async getProjects() {
    let repoNameRegexConfig = this.config.get('repo-name-regex') || '.*';
    let repoNameRegex = new RegExp(repoNameRegexConfig);

    let result = await axios.get('https://circleci.com/api/v1.1/projects', {
      params: {
        'circle-token': this.circleToken,
      },
    });

    let filtered = result.data.filter(project =>
      project['reponame'].match(repoNameRegex)
    );
    return filtered;
  }

  /** Get information about one project.
   * @param {string} project Name of project (without organization name).
   * @param {string} vcs Name of VCS, defaults to github.
   * @returns {Object[]} Array of CircleCI builds executed for the given project.
   */
  async getBuildsForProject(project, vcs) {
    let org = this.config.get('organization');
    vcs = vcs || 'github';
    let result = await axios.get(
      `https://circleci.com/api/v1.1/project/${vcs}/${org}/${project}`,
      {
        params: {
          'circle-token': this.circleToken,
        },
      }
    );
    return result.data;
  }
}

module.exports = CircleCI;
