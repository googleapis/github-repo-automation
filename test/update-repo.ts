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

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import proxyquire from 'proxyquire';
import sinon from 'sinon';

const fakeGitHub = require('./fakes/fake-github.js');
const fakeTmp = require('./fakes/fake-tmp.js');
const tmp = require('tmp-promise');

const execCallback = sinon.spy();
const updateRepo = proxyquire('../src/lib/update-repo.js', {
                     './github': {GitHub: fakeGitHub},
                     'tmp-promise': fakeTmp,
                     child_process: {
                       exec: (command, callback) => {
                         execCallback(command);
                         callback();
                       },
                     },
                   }).updateRepo;

async function suppressConsole(func) {
  console.log = () => {};
  console.warn = () => {};
  console.error = () => {};
  await func();
  delete console.error;
  delete console.warn;
  delete console.log;
}

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
  let tmpDir;

  before(async () => {
    realTmpDir = await tmp.dir({unsafeCleanup: true});
    fakeTmp.setDirName(realTmpDir.path);
    tmpDir = fakeTmp.getDirName();
  });

  beforeEach(() => {
    execCallback.resetHistory();
    fakeGitHub.repository.reset();
    fakeGitHub.repository.testSetFile(
        'master', pathExisting,
        Buffer.from(originalContent).toString('base64'));
    fs.writeFileSync(path.join(tmpDir, pathExisting), changedContent);
    fs.writeFileSync(path.join(tmpDir, pathNonExisting), newContent);
  });

  const attemptUpdate = async (files?) => {
    if (files === undefined) {
      files = [pathExisting, pathNonExisting];
    }
    await suppressConsole(async () => {
      await updateRepo({
        updateCallback: path => {
          assert.equal(path, tmpDir);
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
    assert.equal(
        fakeGitHub.repository.branches['master'][pathExisting]['content'],
        Buffer.from(originalContent).toString('base64'));
    assert.equal(
        fakeGitHub.repository.branches[branch][pathExisting]['content'],
        Buffer.from(changedContent).toString('base64'));
    assert.equal(
        fakeGitHub.repository.branches[branch][pathNonExisting]['content'],
        Buffer.from(newContent).toString('base64'));
    assert.deepEqual(fakeGitHub.repository.prs[1], {
      number: 1,
      branch,
      message,
      comment,
      reviewers,
      html_url: `http://example.com/pulls/1`,
    });
    assert(execCallback.calledOnceWith(`git clone ${
        fakeGitHub.repository.getRepository()['clone_url']} ${tmpDir}`));
  });

  it('should not update a file if it is not a file', async () => {
    fakeGitHub.repository.branches['master'][pathExisting]['type'] =
        'not-a-file';
    try {
      await attemptUpdate();
      assert(false);
    } catch (err) {
      // ignore
    }
    assert.equal(
        fakeGitHub.repository.branches['master'][pathExisting]['content'],
        Buffer.from(originalContent).toString('base64'));
  });

  it('should not update a file if it cannot read it', async () => {
    try {
      await attemptUpdate([pathFailed]);
      assert(false);
    } catch (err) {
      // ignore
    }
  });

  it('should not update a file if cannot get master latest sha', async () => {
    const stub = sinon.stub(fakeGitHub.repository, 'getLatestCommitToMaster')
                     .returns(Promise.reject(new Error('Random error')));
    try {
      await attemptUpdate();
      assert(false);
    } catch (err) {
      // ignore
    }
    stub.restore();
    assert.equal(fakeGitHub.repository.branches[branch], undefined);
  });

  it('should not update a file if cannot create branch', async () => {
    const stub = sinon.stub(fakeGitHub.repository, 'createBranch')
                     .returns(Promise.reject(new Error('Random error')));
    try {
      await attemptUpdate();
      assert(false);
    } catch (err) {
      // ignore
    }
    stub.restore();
    assert.equal(fakeGitHub.repository.branches[branch], undefined);
  });

  it('should not send pull request if cannot update file in branch',
     async () => {
       const stub = sinon.stub(fakeGitHub.repository, 'updateFileInBranch')
                        .returns(Promise.reject(new Error('Random error')));
       try {
         await attemptUpdate();
         assert(false);
       } catch (err) {
         // ignore
       }
       stub.restore();
       assert.equal(fakeGitHub.repository.prs[1], undefined);
     });

  it('should still update a file in branch if cannot create pull request',
     async () => {
       const stub = sinon.stub(fakeGitHub.repository, 'createPullRequest')
                        .returns(Promise.reject(new Error('Random error')));
       try {
         await attemptUpdate();
         assert(false);
       } catch (err) {
         // ignore
       }
       stub.restore();
       assert.equal(
           fakeGitHub.repository.branches['master'][pathExisting]['content'],
           Buffer.from(originalContent).toString('base64'));
       assert.equal(
           fakeGitHub.repository.branches[branch][pathExisting]['content'],
           Buffer.from(changedContent).toString('base64'));
       assert.equal(
           fakeGitHub.repository.branches[branch][pathNonExisting]['content'],
           Buffer.from(newContent).toString('base64'));
     });

  it('should still update a file in branch and create pull request if cannot request review',
     async () => {
       const stub = sinon.stub(fakeGitHub.repository, 'requestReview')
                        .returns(Promise.reject(new Error('Random error')));
       try {
         await attemptUpdate();
         assert(false);
       } catch (err) {
         // ignore
       }
       assert.equal(
           fakeGitHub.repository.branches['master'][pathExisting]['content'],
           Buffer.from(originalContent).toString('base64'));
       assert.equal(
           fakeGitHub.repository.branches[branch][pathExisting]['content'],
           Buffer.from(changedContent).toString('base64'));
       assert.equal(
           fakeGitHub.repository.branches[branch][pathNonExisting]['content'],
           Buffer.from(newContent).toString('base64'));
       assert.deepEqual(fakeGitHub.repository.prs[1], {
         number: 1,
         branch,
         message,
         comment,
         html_url: `http://example.com/pulls/1`,
       });
       stub.restore();
     });

  it('should require updateCallback parameter', async () => {
    try {
      await suppressConsole(async () => {
        await updateRepo({
          branch,
          message,
          comment,
          reviewers,
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
        await updateRepo({
          updateCallback: () => {
            return Promise.resolve();
          },
          message,
          comment,
          reviewers,
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
        await updateRepo({
          updateCallback: () => {
            return;
          },
          branch,
          comment,
          reviewers,
        });
      });
      assert(false);
    } catch (err) {
      // ignore
    }
  });

  it('should require comment parameter', async () => {
    try {
      await suppressConsole(async () => {
        await updateRepo({
          updateCallback: () => {
            return Promise.resolve();
          },
          branch,
          message,
          reviewers,
        });
      });
      assert(false);
    } catch (err) {
      // ignore
    }
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
    assert.equal(
        fakeGitHub.repository.branches['master'][pathExisting]['content'],
        Buffer.from(originalContent).toString('base64'));
    assert.equal(
        fakeGitHub.repository.branches[branch][pathExisting]['content'],
        Buffer.from(changedContent).toString('base64'));
    assert.equal(
        fakeGitHub.repository.branches[branch][pathNonExisting]['content'],
        Buffer.from(newContent).toString('base64'));
    assert.deepEqual(fakeGitHub.repository.prs[1], {
      number: 1,
      branch,
      message,
      comment,
      html_url: `http://example.com/pulls/1`,
    });
  });

  it('should not perform update if updateCallback returned undefined value',
     async () => {
       try {
         await suppressConsole(async () => {
           await updateRepo({
             updateCallback: () => {
               return Promise.resolve(undefined);
             },
             branch,
             message,
             comment,
           });
         });
         assert(false);
       } catch (err) {
         // ignore
       }
       assert.equal(fakeGitHub.repository.branches[branch], undefined);
     });

  it('should not perform update if updateCallback returned empty list',
     async () => {
       try {
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
         assert(false);
       } catch (err) {
         // ignore
       }
       assert.equal(fakeGitHub.repository.branches[branch], undefined);
     });

  it('should not perform update if updateCallback promise was rejected',
     async () => {
       try {
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
         assert(false);
       } catch (err) {
         // ignore
       }
       assert.equal(fakeGitHub.repository.branches[branch], undefined);
     });
});
