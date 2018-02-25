/**
 * @fileoverview Wraps some octokit GitHub API calls.
 */

'use strict';

const fs = require('fs');
const util = require('util');
const readFile = util.promisify(fs.readFile);
const yaml = require('js-yaml');

/** Configuration object. Contains GitHub token, organization and repository
 * filter regex.
 */
class Config {
  /** Constructs a configuration object.
   * @constructor
   * @param {string} configFilename Path to a configuration file. If not given,
   * uses `./config.yaml`.
   */
  constructor(configFilename) {
    this.filename = configFilename || './config.yaml';
  }

  /** Reads the configuration.
   */
  async init() {
    try {
      const yamlContent = await readFile(this.filename);
      this.config = yaml.load(yamlContent);
    } catch (err) {
      console.error(
        `Cannot read configuration file ${
          this.filename
        }. Have you created it? Use config.yaml.default as a sample.`
      );
      throw new Error('Configuration file is not found');
    }
  }

  /** Get option value.
   * @param {string} option Configuration option.
   * @returns {string|Object} Requested value.
   */
  get(option) {
    return this._config[option];
  }

  /** Get configuration object.
   * @returns {Object} Parsed configuration yaml.
   */
  get config() {
    return this._config;
  }

  /** Assigns configuration object.
   * @param {Object} config Configuration object.
   */
  set config(config) {
    this._config = config;
  }
}

module.exports = Config;
