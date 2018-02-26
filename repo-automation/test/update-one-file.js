/**
 * @fileoverview Description of this file.
 */

const assert = require('assert');
const proxyquire = require('proxyquire');
const sinon = require('sinon');

const FakeGitHub = require('./fakes/fake-github.js');
const updateOneFile = proxyquire('../lib/update-one-file.js', {
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

describe('UpdateOneFile', () => {
  let path = '/path/to/file.txt';
  let originalContent = 'content matches';
  let badContent = 'content does not match';
  let changedContent = 'changed content';
  let branch = 'test-branch';
  let message = 'test-message';
  let comment = 'test-comment';
  let reviewers = ['test-reviewer-1', 'test-reviewer-2'];

  beforeEach(() => {
    FakeGitHub.repository.reset();
    FakeGitHub.repository.testSetFile(
      'master',
      path,
      Buffer.from(originalContent).toString('base64')
    );
  });

  afterEach(() => {});

  let attemptUpdate = async () => {
    await suppressConsole(async () => {
      await updateOneFile({
        path,
        patchFunction: str => {
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
    assert.equal(
      FakeGitHub.repository.branches['master'][path]['content'],
      Buffer.from(originalContent).toString('base64')
    );
    assert.equal(
      FakeGitHub.repository.branches[branch][path]['content'],
      Buffer.from(changedContent).toString('base64')
    );
    assert.deepEqual(FakeGitHub.repository.prs[1], {
      number: 1,
      branch,
      message,
      comment,
      reviewers,
      html_url: `http://example.com/pulls/1`,
    });
  });

  it('should not update a file if it is not a file', async () => {
    FakeGitHub.repository.branches['master'][path]['type'] = 'not-a-file';
    try {
      await attemptUpdate();
      assert(false);
    } catch (err) {
      // ignore
    }
    assert.equal(
      FakeGitHub.repository.branches['master'][path]['content'],
      Buffer.from(originalContent).toString('base64')
    );
    assert.equal(FakeGitHub.repository.branches[branch], undefined);
  });

  it('should not update a file if content does not match', async () => {
    FakeGitHub.repository.testSetFile(
      'master',
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
      FakeGitHub.repository.branches['master'][path]['content'],
      Buffer.from(badContent).toString('base64')
    );
    assert.equal(FakeGitHub.repository.branches[branch], undefined);
  });

  it('should not update a file if it does not exist', async () => {
    delete FakeGitHub.repository.branches['master'][path];
    try {
      await attemptUpdate();
      assert(false);
    } catch (err) {
      // ignore
    }
    assert.equal(FakeGitHub.repository.branches['master'][path], undefined);
    assert.equal(FakeGitHub.repository.branches[branch], undefined);
  });

  it('should not update a file if cannot get master latest sha', async () => {
    let stub = sinon
      .stub(FakeGitHub.repository, 'getLatestCommitToMaster')
      .returns(Promise.reject(new Error('Random error')));
    try {
      await attemptUpdate();
      assert(false);
    } catch (err) {
      // ignore
    }
    stub.restore();
    assert.equal(
      FakeGitHub.repository.branches['master'][path]['content'],
      Buffer.from(originalContent).toString('base64')
    );
    assert.equal(FakeGitHub.repository.branches[branch], undefined);
  });

  it('should not update a file if cannot create branch', async () => {
    let stub = sinon
      .stub(FakeGitHub.repository, 'createBranch')
      .returns(Promise.reject(new Error('Random error')));
    try {
      await attemptUpdate();
      assert(false);
    } catch (err) {
      // ignore
    }
    stub.restore();
    assert.equal(
      FakeGitHub.repository.branches['master'][path]['content'],
      Buffer.from(originalContent).toString('base64')
    );
    assert.equal(FakeGitHub.repository.branches[branch], undefined);
  });

  it('should not send pull request if cannot update file in branch', async () => {
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
      FakeGitHub.repository.branches['master'][path]['content'],
      Buffer.from(originalContent).toString('base64')
    );
    assert.equal(
      FakeGitHub.repository.branches[branch][path]['content'],
      Buffer.from(originalContent).toString('base64')
    );
    assert.equal(FakeGitHub.repository.prs[1], undefined);
  });

  it('should still update a file in branch if cannot create pull request', async () => {
    let stub = sinon
      .stub(FakeGitHub.repository, 'createPullRequest')
      .returns(Promise.reject(new Error('Random error')));
    try {
      await attemptUpdate();
      assert(false);
    } catch (err) {
      // ignore
    }
    stub.restore();
    assert.equal(
      FakeGitHub.repository.branches['master'][path]['content'],
      Buffer.from(originalContent).toString('base64')
    );
    assert.equal(
      FakeGitHub.repository.branches[branch][path]['content'],
      Buffer.from(changedContent).toString('base64')
    );
  });

  it('should still update a file in branch and create pull request if cannot request review', async () => {
    let stub = sinon
      .stub(FakeGitHub.repository, 'requestReview')
      .returns(Promise.reject(new Error('Random error')));
    try {
      await attemptUpdate();
      assert(false);
    } catch (err) {
      // ignore
    }
    assert.equal(
      FakeGitHub.repository.branches['master'][path]['content'],
      Buffer.from(originalContent).toString('base64')
    );
    assert.equal(
      FakeGitHub.repository.branches[branch][path]['content'],
      Buffer.from(changedContent).toString('base64')
    );
    assert.deepEqual(FakeGitHub.repository.prs[1], {
      number: 1,
      branch,
      message,
      comment,
      html_url: `http://example.com/pulls/1`,
    });
    stub.restore();
  });

  it('should require path parameter', async () => {
    try {
      await suppressConsole(async () => {
        await updateOneFile({
          patchFunction: str => {
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
      assert(false);
    } catch (err) {
      // ignore
    }
  });

  it('should require patchFunction parameter', async () => {
    try {
      await suppressConsole(async () => {
        await updateOneFile({
          path,
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
        await updateOneFile({
          path,
          patchFunction: str => {
            if (str === originalContent) {
              return changedContent;
            }
            return;
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
        await updateOneFile({
          path,
          patchFunction: str => {
            if (str === originalContent) {
              return changedContent;
            }
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
        await updateOneFile({
          path,
          patchFunction: str => {
            if (str === originalContent) {
              return changedContent;
            }
            return;
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
      await updateOneFile({
        path,
        patchFunction: str => {
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
    assert.equal(
      FakeGitHub.repository.branches['master'][path]['content'],
      Buffer.from(originalContent).toString('base64')
    );
    assert.equal(
      FakeGitHub.repository.branches[branch][path]['content'],
      Buffer.from(changedContent).toString('base64')
    );
    assert.deepEqual(FakeGitHub.repository.prs[1], {
      number: 1,
      branch,
      message,
      comment,
      html_url: `http://example.com/pulls/1`,
    });
  });
});
