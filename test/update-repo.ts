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
 * @fileoverview Tests for lib/update-repo.js.
 */

import * as assert from 'assert';
import {describe, it} from 'mocha';
import * as fs from 'fs';
import * as path from 'path';
import * as proxyquire from 'proxyquire';
import * as sinon from 'sinon';

import * as fakeGitHub from './fakes/fake-github';
import * as fakeTmp from './fakes/fake-tmp';
import * as tmp from 'tmp-promise';
import {suppressConsole} from './util';

const execCallback = sinon.spy();
const {updateRepo} = proxyquire('../src/lib/update-repo', {
  './github': {GitHub: fakeGitHub.FakeGitHub},
  './config': {getConfig: () => Promise.resolve({})},
  'tmp-promise': fakeTmp,
  child_process: {
    exec: (command: string, callback: Function) => {
      execCallback(command);
      callback();
    },
  },
});

describe('UpdateRepo', () => {
  const pathExisting = 'file1.txt';
  const pathNonExisting = 'file2.txt';
  const pathFailed = 'failed.txt';
  const originalContent = 'content';
  const changedContent = 'changed content';
  const newContent = 'new content';
  const branch = 'test-branch';
  const message = 'test-message';
  const comment = 'test-comment';
  const reviewers = ['test-reviewer-1', 'test-reviewer-2'];
  let realTmpDir;
  let tmpDir: string;

  // eslint-disable-next-line no-undef
  before(async () => {
    realTmpDir = await tmp.dir({unsafeCleanup: true});
    fakeTmp.setDirName(realTmpDir.path);
    tmpDir = fakeTmp.getDirName();
  });
  // eslint-disable-next-line no-undef
  beforeEach(() => {
    execCallback.resetHistory();
    fakeGitHub.repository.reset();
    fakeGitHub.repository.testSetFile(
      'master',
      pathExisting,
      Buffer.from(originalContent).toString('base64')
    );
    fs.writeFileSync(path.join(tmpDir, pathExisting), changedContent);
    fs.writeFileSync(path.join(tmpDir, pathNonExisting), newContent);
  });

  const attemptUpdate = async (files?: string[]) => {
    if (files === undefined) {
      files = [pathExisting, pathNonExisting];
    }
    await suppressConsole(async () => {
      await updateRepo({
        updateCallback: (path: string) => {
          assert.strictEqual(path, tmpDir);
          return Promise.resolve(files);
        },
        branch,
        message,
        comment,
        reviewers,
      });
    });
  };

  it('should perform update', async () => {
    await attemptUpdate();
    assert.strictEqual(
      fakeGitHub.repository.branches['master'][pathExisting]['content'],
      Buffer.from(originalContent).toString('base64')
    );
    assert.strictEqual(
      fakeGitHub.repository.branches[branch][pathExisting]['content'],
      Buffer.from(changedContent).toString('base64')
    );
    assert.strictEqual(
      fakeGitHub.repository.branches[branch][pathNonExisting]['content'],
      Buffer.from(newContent).toString('base64')
    );
    assert.deepStrictEqual(fakeGitHub.repository.prs[1], {
      number: 1,
      branch,
      message,
      comment,
      reviewers,
      html_url: 'http://example.com/pulls/1',
      base: 'master',
    });
    assert(
      execCallback.calledOnceWith(
        `git clone ${
          fakeGitHub.repository.getRepository()['ssh_url']
        } ${tmpDir}`
      )
    );
  });

  it('should target the base branch', async () => {
    fakeGitHub.repository.testChangeBaseBranch('main');
    fakeGitHub.repository.testSetFile(
      'main',
      pathExisting,
      Buffer.from(originalContent).toString('base64')
    );
    await attemptUpdate();
    assert.strictEqual(
      fakeGitHub.repository.branches['main'][pathExisting]['content'],
      Buffer.from(originalContent).toString('base64')
    );
    assert.strictEqual(
      fakeGitHub.repository.branches[branch][pathExisting]['content'],
      Buffer.from(changedContent).toString('base64')
    );
    assert.strictEqual(
      fakeGitHub.repository.branches[branch][pathNonExisting]['content'],
      Buffer.from(newContent).toString('base64')
    );
    assert.deepStrictEqual(fakeGitHub.repository.prs[1], {
      number: 1,
      branch,
      message,
      comment,
      reviewers,
      html_url: 'http://example.com/pulls/1',
      base: 'main',
    });
    assert(
      execCallback.calledOnceWith(
        `git clone ${
          fakeGitHub.repository.getRepository()['ssh_url']
        } ${tmpDir}`
      )
    );
  });

  it('should not update a file if it is not a file', async () => {
    fakeGitHub.repository.branches['master'][pathExisting]['type'] =
      'not-a-file';
    await attemptUpdate();
    assert.strictEqual(
      fakeGitHub.repository.branches['master'][pathExisting]['content'],
      Buffer.from(originalContent).toString('base64')
    );
  });

  it('should not update a file if it cannot read it', async () => {
    await attemptUpdate([pathFailed]);
  });

  it('should not update a file if cannot get master latest sha', async () => {
    const stub = sinon
      .stub(fakeGitHub.repository, 'getLatestCommitToBaseBranch')
      .returns(Promise.reject(new Error('Random error')));
    await attemptUpdate();
    stub.restore();
    assert.strictEqual(fakeGitHub.repository.branches[branch], undefined);
  });

  it('should not update a file if cannot create branch', async () => {
    const stub = sinon
      .stub(fakeGitHub.repository, 'createBranch')
      .returns(Promise.reject(new Error('Random error')));
    await attemptUpdate();
    stub.restore();
    assert.strictEqual(fakeGitHub.repository.branches[branch], undefined);
  });

  it('should not send pull request if cannot update file in branch', async () => {
    const stub = sinon
      .stub(fakeGitHub.repository, 'updateFileInBranch')
      .rejects('Random error');
    await attemptUpdate();
    stub.restore();
    assert.strictEqual(fakeGitHub.repository.prs[1], undefined);
  });

  it('should still update a file in branch if cannot create pull request', async () => {
    const stub = sinon
      .stub(fakeGitHub.repository, 'createPullRequest')
      .rejects('Random error');
    await attemptUpdate();
    stub.restore();
    assert.strictEqual(
      fakeGitHub.repository.branches['master'][pathExisting]['content'],
      Buffer.from(originalContent).toString('base64')
    );
    assert.strictEqual(
      fakeGitHub.repository.branches[branch][pathExisting]['content'],
      Buffer.from(changedContent).toString('base64')
    );
    assert.strictEqual(
      fakeGitHub.repository.branches[branch][pathNonExisting]['content'],
      Buffer.from(newContent).toString('base64')
    );
  });

  it('should still update a file in branch and create pull request if cannot request review', async () => {
    const stub = sinon
      .stub(fakeGitHub.repository, 'requestReview')
      .rejects('Random error');
    await attemptUpdate();
    assert.strictEqual(
      fakeGitHub.repository.branches['master'][pathExisting]['content'],
      Buffer.from(originalContent).toString('base64')
    );
    assert.strictEqual(
      fakeGitHub.repository.branches[branch][pathExisting]['content'],
      Buffer.from(changedContent).toString('base64')
    );
    assert.strictEqual(
      fakeGitHub.repository.branches[branch][pathNonExisting]['content'],
      Buffer.from(newContent).toString('base64')
    );
    assert.deepStrictEqual(fakeGitHub.repository.prs[1], {
      number: 1,
      branch,
      message,
      comment,
      html_url: 'http://example.com/pulls/1',
      base: 'master',
    });
    stub.restore();
  });

  it('should require updateCallback parameter', async () => {
    await suppressConsole(async () => {
      await assert.rejects(
        updateRepo({
          branch,
          message,
          comment,
          reviewers,
        }),
        /updateCallback is required/
      );
    });
  });

  it('should require branch parameter', async () => {
    await suppressConsole(async () => {
      await assert.rejects(
        updateRepo({
          updateCallback: () => {
            return Promise.resolve();
          },
          message,
          comment,
          reviewers,
        }),
        /branch is required/
      );
    });
  });

  it('should require message parameter', async () => {
    await suppressConsole(async () => {
      await assert.rejects(
        updateRepo({
          updateCallback: () => {
            return;
          },
          branch,
          comment,
          reviewers,
        }),
        /message is required/
      );
    });
  });

  it('should not send review if no reviewers', async () => {
    await suppressConsole(async () => {
      await updateRepo({
        updateCallback: () => {
          return Promise.resolve([pathExisting, pathNonExisting]);
        },
        branch,
        message,
        comment,
      });
    });
    assert.strictEqual(
      fakeGitHub.repository.branches['master'][pathExisting]['content'],
      Buffer.from(originalContent).toString('base64')
    );
    assert.strictEqual(
      fakeGitHub.repository.branches[branch][pathExisting]['content'],
      Buffer.from(changedContent).toString('base64')
    );
    assert.strictEqual(
      fakeGitHub.repository.branches[branch][pathNonExisting]['content'],
      Buffer.from(newContent).toString('base64')
    );
    assert.deepStrictEqual(fakeGitHub.repository.prs[1], {
      number: 1,
      branch,
      message,
      comment,
      html_url: 'http://example.com/pulls/1',
      base: 'master',
    });
  });

  it('should not perform update if updateCallback returned undefined value', async () => {
    suppressConsole(async () => {
      await updateRepo({
        updateCallback: () => {
          return Promise.resolve(undefined);
        },
        branch,
        message,
        comment,
      });
    });
    assert.strictEqual(fakeGitHub.repository.branches[branch], undefined);
  });

  it('should not perform update if updateCallback returned empty list', async () => {
    await suppressConsole(async () => {
      await updateRepo({
        updateCallback: () => {
          return Promise.resolve([]);
        },
        branch,
        message,
        comment,
      });
    });
    assert.strictEqual(fakeGitHub.repository.branches[branch], undefined);
  });

  it('should not perform update if updateCallback promise was rejected', async () => {
    await suppressConsole(async () => {
      await updateRepo({
        updateCallback: () => {
          return Promise.reject();
        },
        branch,
        message,
        comment,
      });
    });
    assert.strictEqual(fakeGitHub.repository.branches[branch], undefined);
  });
});
