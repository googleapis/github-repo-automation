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
 * @fileoverview Tests for lib/update-file.js.
 */

import * as assert from 'assert';
import {describe, it} from 'mocha';
import * as proxyquire from 'proxyquire';
import * as sinon from 'sinon';
import * as fakeGitHub from './fakes/fake-github';
const {updateFile} = proxyquire('../src/lib/update-file', {
  './config': {getConfig: () => Promise.resolve({})},
  './github': {GitHub: fakeGitHub.FakeGitHub},
});
import {suppressConsole} from './util';

describe('UpdateFile', () => {
  const path = '/path/to/file.txt';
  const originalContent = 'content matches';
  const badContent = 'content does not match';
  const changedContent = 'changed content';
  const branch = 'test-branch';
  const message = 'test-message';
  const comment = 'test-comment';
  const reviewers = ['test-reviewer-1', 'test-reviewer-2'];
  // eslint-disable-next-line no-undef
  beforeEach(() => {
    fakeGitHub.repository.reset();
    fakeGitHub.repository.testSetFile(
      'master',
      path,
      Buffer.from(originalContent).toString('base64')
    );
  });
  /* eslint-disable @typescript-eslint/no-empty-function */
  // eslint-disable-next-line no-undef
  afterEach(() => {});

  const attemptUpdate = async () => {
    await suppressConsole(async () => {
      await updateFile({
        path,
        patchFunction: (str: string) => {
          if (str === originalContent) {
            return changedContent;
          }
          return;
        },
        branch,
        message,
        comment,
        reviewers,
      });
    });
  };

  it('should update one file if content matches', async () => {
    await attemptUpdate();
    assert.strictEqual(
      fakeGitHub.repository.branches['master'][path]['content'],
      Buffer.from(originalContent).toString('base64')
    );
    assert.strictEqual(
      fakeGitHub.repository.branches[branch][path]['content'],
      Buffer.from(changedContent).toString('base64')
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
  });

  it('should target the base branch instead of master', async () => {
    fakeGitHub.repository.testChangeBaseBranch('main');
    fakeGitHub.repository.testSetFile(
      'main',
      path,
      Buffer.from(originalContent).toString('base64')
    );
    await attemptUpdate();
    assert.strictEqual(
      fakeGitHub.repository.branches['main'][path]['content'],
      Buffer.from(originalContent).toString('base64')
    );
    assert.strictEqual(
      fakeGitHub.repository.branches[branch][path]['content'],
      Buffer.from(changedContent).toString('base64')
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
  });

  it('should not update a file if it is not a file', async () => {
    fakeGitHub.repository.branches['master'][path]['type'] = 'not-a-file';
    await attemptUpdate();
    assert.strictEqual(
      fakeGitHub.repository.branches['master'][path]['content'],
      Buffer.from(originalContent).toString('base64')
    );
    assert.strictEqual(fakeGitHub.repository.branches[branch], undefined);
  });

  it('should not update a file if content does not match', async () => {
    fakeGitHub.repository.testSetFile(
      'master',
      path,
      Buffer.from(badContent).toString('base64')
    );
    await attemptUpdate();
    assert.strictEqual(
      fakeGitHub.repository.branches['master'][path]['content'],
      Buffer.from(badContent).toString('base64')
    );
    assert.strictEqual(fakeGitHub.repository.branches[branch], undefined);
  });

  it('should not update a file if it does not exist', async () => {
    delete fakeGitHub.repository.branches['master'][path];
    await attemptUpdate();
    assert.strictEqual(
      fakeGitHub.repository.branches['master'][path],
      undefined
    );
    assert.strictEqual(fakeGitHub.repository.branches[branch], undefined);
  });

  it('should not update a file if cannot get master latest sha', async () => {
    const stub = sinon
      .stub(fakeGitHub.repository, 'getLatestCommitToBaseBranch')
      .returns(Promise.reject(new Error('Random error')));
    await attemptUpdate();
    stub.restore();
    assert.strictEqual(
      fakeGitHub.repository.branches['master'][path]['content'],
      Buffer.from(originalContent).toString('base64')
    );
    assert.strictEqual(fakeGitHub.repository.branches[branch], undefined);
  });

  it('should not update a file if cannot create branch', async () => {
    const stub = sinon
      .stub(fakeGitHub.repository, 'createBranch')
      .returns(Promise.reject(new Error('Random error')));
    await attemptUpdate();
    stub.restore();
    assert.strictEqual(
      fakeGitHub.repository.branches['master'][path]['content'],
      Buffer.from(originalContent).toString('base64')
    );
    assert.strictEqual(fakeGitHub.repository.branches[branch], undefined);
  });

  it('should not send pull request if cannot update file in branch', async () => {
    const stub = sinon
      .stub(fakeGitHub.repository, 'updateFileInBranch')
      .returns(Promise.reject(new Error('Random error')));
    await attemptUpdate();
    stub.restore();
    assert.strictEqual(
      fakeGitHub.repository.branches['master'][path]['content'],
      Buffer.from(originalContent).toString('base64')
    );
    assert.strictEqual(
      fakeGitHub.repository.branches[branch][path]['content'],
      Buffer.from(originalContent).toString('base64')
    );
    assert.strictEqual(fakeGitHub.repository.prs[1], undefined);
  });

  it('should still update a file in branch if cannot create pull request', async () => {
    const stub = sinon
      .stub(fakeGitHub.repository, 'createPullRequest')
      .returns(Promise.reject(new Error('Random error')));
    await attemptUpdate();
    stub.restore();
    assert.strictEqual(
      fakeGitHub.repository.branches['master'][path]['content'],
      Buffer.from(originalContent).toString('base64')
    );
    assert.strictEqual(
      fakeGitHub.repository.branches[branch][path]['content'],
      Buffer.from(changedContent).toString('base64')
    );
  });

  it('should still update a file in branch and create pull request if cannot request review', async () => {
    const stub = sinon
      .stub(fakeGitHub.repository, 'requestReview')
      .returns(Promise.reject(new Error('Random error')));
    await attemptUpdate();
    assert.strictEqual(
      fakeGitHub.repository.branches['master'][path]['content'],
      Buffer.from(originalContent).toString('base64')
    );
    assert.strictEqual(
      fakeGitHub.repository.branches[branch][path]['content'],
      Buffer.from(changedContent).toString('base64')
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

  it('should require path parameter', async () => {
    await suppressConsole(async () => {
      await assert.rejects(
        updateFile({
          patchFunction: (str: string) => {
            if (str === originalContent) {
              return changedContent;
            }
            return;
          },
          branch,
          message,
          comment,
          reviewers,
        }),
        /path is required/
      );
    });
  });

  it('should require patchFunction parameter', async () => {
    await suppressConsole(async () => {
      await assert.rejects(
        updateFile({
          path,
          branch,
          message,
          comment,
          reviewers,
        }),
        /patchFunction is required/
      );
    });
  });

  it('should require branch parameter', async () => {
    await suppressConsole(async () => {
      await assert.rejects(
        updateFile({
          path,
          patchFunction: (str: string) => {
            if (str === originalContent) {
              return changedContent;
            }
            return;
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
        updateFile({
          path,
          patchFunction: (str: string) => {
            if (str === originalContent) {
              return changedContent;
            }
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
      await updateFile({
        path,
        patchFunction: (str: string) => {
          if (str === originalContent) {
            return changedContent;
          }
          return;
        },
        branch,
        message,
        comment,
      });
    });
    assert.strictEqual(
      fakeGitHub.repository.branches['master'][path]['content'],
      Buffer.from(originalContent).toString('base64')
    );
    assert.strictEqual(
      fakeGitHub.repository.branches[branch][path]['content'],
      Buffer.from(changedContent).toString('base64')
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
});
