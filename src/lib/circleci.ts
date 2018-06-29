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
 * @fileoverview Wraps some CircleCI API calls.
 */

'use strict';

import {Config} from './config';
import axios from 'axios';

/** Wraps some CircleCI API calls.
 */
export class CircleCI {

  circleToken?: string;
  config;

  /** Reads configuration file and sets up GitHub authentication.
   * @param {string} configFileName Path to configuration yaml file.
   */
  async init(configFilename?: string) {
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
    let repoNameRegexConfig = this.config.get('repo-name-regex');
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
