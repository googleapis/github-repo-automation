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
 * @fileoverview Tests for lib/update-file-in-branch.js.
 */

import assert from 'assert';
import proxyquire from 'proxyquire';
import sinon from 'sinon';

const FakeGitHub = require('./fakes/fake-github.js');
const updateFileInBranch = proxyquire('../src/lib/update-file-in-branch.js', {
  './github.js': FakeGitHub,
});

async function suppressConsole(func) {
  console.log = () => {};
  console.warn = () => {};
  console.error = () => {};
  await func();
  delete console.error;
  delete console.warn;
  delete console.log;
}

describe('UpdateFileInBranch', () => {
  let path = '/path/to/file.txt';
  let originalContent = 'content matches';
  let badContent = 'content does not match';
  let changedContent = 'changed content';
  let branch = 'test-branch';
  let message = 'test-message';

  beforeEach(() => {
    FakeGitHub.repository.reset();
    FakeGitHub.repository.testSetFile(
      branch,
      path,
      Buffer.from(originalContent).toString('base64')
    );
  });

  afterEach(() => {});

  let attemptUpdate = async () => {
    await suppressConsole(async () => {
      await updateFileInBranch({
        path,
        patchFunction: str => {
          if (str === originalContent) {
            return changedContent;
          }
          return;
        },
        branch,
        message,
      });
    });
  };

  it('should update one file if content matches', async () => {
    await attemptUpdate();
    assert.equal(
      FakeGitHub.repository.branches[branch][path]['content'],
      Buffer.from(changedContent).toString('base64')
    );
  });

  it('should not update a file if it is not a file', async () => {
    FakeGitHub.repository.branches[branch][path]['type'] = 'not-a-file';
    try {
      await attemptUpdate();
      assert(false);
    } catch (err) {
      // ignore
    }
    assert.equal(
      FakeGitHub.repository.branches[branch][path]['content'],
      Buffer.from(originalContent).toString('base64')
    );
  });

  it('should not update a file if content does not match', async () => {
    FakeGitHub.repository.testSetFile(
      branch,
      path,
      Buffer.from(badContent).toString('base64')
    );
    try {
      await attemptUpdate();
      assert(false);
    } catch (err) {
      // ignore
    }
    assert.equal(
      FakeGitHub.repository.branches[branch][path]['content'],
      Buffer.from(badContent).toString('base64')
    );
  });

  it('should not update a file if it does not exist', async () => {
    delete FakeGitHub.repository.branches[branch][path];
    try {
      await attemptUpdate();
      assert(false);
    } catch (err) {
      // ignore
    }
    assert.equal(FakeGitHub.repository.branches[branch][path], undefined);
  });

  it('should handle error if cannot update file in branch', async () => {
    let stub = sinon
      .stub(FakeGitHub.repository, 'updateFileInBranch')
      .returns(Promise.reject(new Error('Random error')));
    try {
      await attemptUpdate();
      assert(false);
    } catch (err) {
      // ignore
    }
    stub.restore();
    assert.equal(
      FakeGitHub.repository.branches[branch][path]['content'],
      Buffer.from(originalContent).toString('base64')
    );
  });

  it('should require path parameter', async () => {
    try {
      await suppressConsole(async () => {
        await updateFileInBranch({
          patchFunction: str => {
            if (str === originalContent) {
              return changedContent;
            }
            return;
          },
          branch,
          message,
        });
      });
      assert(false);
    } catch (err) {
      // ignore
    }
  });

  it('should require patchFunction parameter', async () => {
    try {
      await suppressConsole(async () => {
        await updateFileInBranch({
          path,
          branch,
          message,
        });
      });
      assert(false);
    } catch (err) {
      // ignore
    }
  });

  it('should require branch parameter', async () => {
    try {
      await suppressConsole(async () => {
        await updateFileInBranch({
          path,
          patchFunction: str => {
            if (str === originalContent) {
              return changedContent;
            }
            return;
          },
          message,
        });
      });
      assert(false);
    } catch (err) {
      // ignore
    }
  });

  it('should require message parameter', async () => {
    try {
      await suppressConsole(async () => {
        await updateFileInBranch({
          path,
          patchFunction: str => {
            if (str === originalContent) {
              return changedContent;
            }
            return;
          },
          branch,
        });
      });
      assert(false);
    } catch (err) {
      // ignore
    }
  });
});
