/**
 * @fileoverview Description of this file.
 */

const assert = require('assert');
const proxyquire = require('proxyquire');

const FakeGitHub = require('./fakes/fake-github.js');
const updateOneFile = proxyquire('../lib/update-one-file.js', {
  './github.js': FakeGitHub,
});

describe('UpdateOneFile', () => {
  beforeEach(() => {
    FakeGitHub.repository1.reset();
    FakeGitHub.repository2.reset();
    console.log = () => {};
    console.warn = () => {};
    console.error = () => {};
  });
  afterEach(() => {
    delete console.log;
    delete console.warn;
    delete console.error;
  });
  it.only('should update one file if content matches', async () => {
    let path = '/path/to/file.txt';
    let originalContent = 'content matches';
    let changedContent = 'changed content';
    let branch = 'test-branch';
    let message = 'test-message';
    let comment = 'test-comment';
    let reviewers = ['test-reviewer-1', 'test-reviewer-2'];
    FakeGitHub.repository1.testSetFile(
      'master',
      path,
      Buffer.from(originalContent).toString('base64')
    );
    FakeGitHub.repository2.testSetFile(
      'master',
      path,
      Buffer.from(originalContent).toString('base64')
    );
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
    assert.equal(
      FakeGitHub.repository1.branches[branch][path]['content'],
      Buffer.from(changedContent).toString('base64')
    );
    assert.equal(
      FakeGitHub.repository2.branches[branch][path]['content'],
      Buffer.from(changedContent).toString('base64')
    );
    assert.deepEqual(FakeGitHub.repository1.prs[1], {
      number: 1,
      branch,
      message,
      comment,
      reviewers,
      html_url: `http://example.com/pulls/1`
    });
    assert.deepEqual(FakeGitHub.repository2.prs[1], {
      number: 1,
      branch,
      message,
      comment,
      reviewers,
      html_url: `http://example.com/pulls/1`
    });
  });
});
