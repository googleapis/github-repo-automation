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
 * @fileoverview Fake GitHub and GitHubRepository implementations for tests.
 */

import * as crypto from 'crypto';
import {Config} from '../../src/lib/config';
import {Repository} from '../../src/lib/github';

function hash(input: string) {
  return crypto.createHash('md5').update(input).digest('hex');
}

export class FakeGitHubRepository {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  branches: any;
  /* eslint-disable @typescript-eslint/no-explicit-any */
  prs: any;
  /* eslint-disable @typescript-eslint/no-explicit-any */
  baseBranch: any;

  _name?: string;

  constructor(name: string) {
    this.name = name;
  }

  reset() {
    this.branches = {
      master: {
        _latest: hash('latest-master-commit'),
      },
    };
    this.prs = {
      _count: 0,
    };
    this.baseBranch = 'master';
  }

  testSetFile(branch: string, path: string, content: string) {
    if (this.branches[branch] === undefined) {
      this.branches[branch] = {};
    }
    const sha = hash(content);
    const type = 'file';
    this.branches[branch][path] = {content, sha, type};
  }

  testChangeBaseBranch(newBaseBranch: string) {
    this.baseBranch = newBaseBranch;
    this.branches[newBaseBranch] = {_latest: this.branches.master._latest};
    delete this.branches.master._latest;
  }

  getRepository() {
    return {ssh_url: 'https://fake-clone-url/test.git'} as Repository;
  }

  async getFileFromBranch(branch: string, path: string) {
    if (this.branches[branch][path] === undefined) {
      return Promise.reject(`No file ${path} in branch ${branch}`);
    }
    return Promise.resolve(this.branches[branch][path]);
  }

  async getFile(path: string) {
    return this.getFileFromBranch(this.baseBranch, path);
  }

  async getLatestCommitToBaseBranch(customBranch?: string) {
    const sha = this.branches[customBranch || this.baseBranch]['_latest'];
    return Promise.resolve({sha});
  }

  async createBranch(branch: string, latestSha: string) {
    if (this.branches[branch] !== undefined) {
      return Promise.reject(`Branch ${branch} already exists`);
    }
    if (this.branches[this.baseBranch]['_latest'] !== latestSha) {
      return Promise.reject(
        `SHA ${latestSha} is not found in branch ${branch}`
      );
    }
    this.branches[branch] = Object.assign({}, this.branches[this.baseBranch]);
    return Promise.resolve({});
  }

  async createFileInBranch(
    branch: string,
    path: string,
    message: string,
    content: string
  ) {
    if (this.branches[branch] === undefined) {
      return Promise.reject(`Branch ${branch} does not exist`);
    }
    if (this.branches[branch][path] !== undefined) {
      return Promise.reject(`File ${path} already exists in branch ${branch}`);
    }
    const sha = hash(content);
    const newFile = {content, sha, message};
    this.branches[branch][path] = newFile;
    this.branches[branch]['_latest'] = sha;
    return Promise.resolve(newFile);
  }

  async updateFileInBranch(
    branch: string,
    path: string,
    message: string,
    content: string,
    oldFileSha: string
  ) {
    if (this.branches[branch] === undefined) {
      return Promise.reject(`Branch ${branch} does not exist`);
    }
    if (this.branches[branch][path] === undefined) {
      return Promise.reject(`File ${path} does not exist in branch ${branch}`);
    }
    const file = this.branches[branch][path];
    if (file['sha'] !== oldFileSha) {
      return Promise.reject(
        `SHA of file ${path} in branch ${branch} is ${file['sha']} but not ${oldFileSha}`
      );
    }
    const sha = hash(content);
    const newFile = {content, sha, message};
    this.branches[branch][path] = newFile;
    this.branches[branch]['_latest'] = sha;
    return Promise.resolve(newFile);
  }

  async createPullRequest(branch: string, message: string, comment: string) {
    if (this.branches[branch] === undefined) {
      return Promise.reject(`Branch ${branch} does not exist`);
    }
    const prNumber = ++this.prs['_count'];
    const htmlUrl = `http://example.com/pulls/${prNumber}`;
    const pr = {
      number: prNumber,
      branch,
      message,
      comment,
      base: this.baseBranch,
      html_url: htmlUrl,
    };
    this.prs[prNumber] = pr;
    return Promise.resolve(pr);
  }

  async requestReview(prNumber: number, reviewers: string[]) {
    if (this.prs[prNumber] === undefined) {
      return Promise.reject(`Pull request ${prNumber} does not exist`);
    }
    this.prs[prNumber]['reviewers'] = reviewers;
    return this.prs[prNumber];
  }

  get name() {
    return this._name;
  }

  set name(n) {
    this._name = n;
  }
}

export const repository = new FakeGitHubRepository('test-repository');

export class FakeGitHub {
  protected config: Config;
  constructor(config: Config) {
    this.config = config;
  }

  async getRepositories() {
    return [repository];
  }
}
