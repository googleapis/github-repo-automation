/**
 * @fileoverview Configuration object to be used by other files.
 */

const fs = require('fs');
const util = require('util');
const readFile = util.promisify(fs.readFile);
const yaml = require('js-yaml');

class Config {
  constructor(configFilename) {
    this.filename = configFilename || './config.yaml';
  }

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

  get(option) {
    return this.configData[option];
  }

  get config() {
    return this.config;
  }

  set config(configData) {
    this.configData = configData;
  }
}

module.exports = Config;
