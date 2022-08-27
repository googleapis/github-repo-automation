// Copyright 2022 Google LLC
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
 * @fileoverview Unit tests for lib/asyncItemIterator.js.
 */

import assert from 'assert';
import meow from 'meow';
import {describe, it} from 'mocha';
import nock from 'nock';
import * as sinon from 'sinon';

import {GitHubRepository, PullRequest} from '../src/lib/github.js';
import * as config from '../src/lib/config.js';
import {processPRs} from '../src/lib/asyncItemIterator.js';

nock.disableNetConnect();

describe('asyncItemIterator', () => {
  afterEach(() => {
    sinon.restore();
  });
  it('should retry list operation on failure', async () => {
    sinon.stub(config.GetConfig, 'getConfig').resolves({
      githubToken: 'abc123',
      clonePath: '/foo/bar',
      retryStrategy: [5, 10, 20],
      repoSearch:
        'org:googleapis language:typescript language:javascript is:public archived:false',
    });
    const cli = {
      flags: {
        title: '.*',
        retry: true,
        nocache: true,
      },
    } as unknown as ReturnType<typeof meow>;
    const githubRequests = nock('https://api.github.com')
      .get(
        '/search/repositories?per_page=100&page=1&q=org%3Agoogleapis%20language%3Atypescript%20language%3Ajavascript%20is%3Apublic%20archived%3Afalse'
      )
      .reply(200, {
        items: [
          {
            full_name: 'googleapis/foo',
            default_branch: 'main',
          },
        ],
      })
      .get('/repos/googleapis/foo/pulls?state=open&page=1')
      .reply(403)
      .get('/repos/googleapis/foo/pulls?state=open&page=1')
      .reply(403)
      .get('/repos/googleapis/foo/pulls?state=open&page=1')
      .reply(200);
    await processPRs(cli, {
      commandName: 'update',
      commandActive: 'updating',
      commandNamePastTense: 'updated',
      commandDesc:
        'Iterates over all PRs matching the regex, and updates them, to the latest on the base branch.',
      processMethod: async () => {
        return true;
      },
    });
    githubRequests.done();
  });
  it('should retry process method if it returns false', async () => {
    sinon.stub(config.GetConfig, 'getConfig').resolves({
      githubToken: 'abc123',
      clonePath: '/foo/bar',
      retryStrategy: [5, 10, 20],
      repoSearch:
        'org:googleapis language:typescript language:javascript is:public archived:false',
    });
    const cli = {
      flags: {
        title: '.*',
        retry: true,
        nocache: true,
      },
    } as unknown as ReturnType<typeof meow>;
    const githubRequests = nock('https://api.github.com')
      .get(
        '/search/repositories?per_page=100&page=1&q=org%3Agoogleapis%20language%3Atypescript%20language%3Ajavascript%20is%3Apublic%20archived%3Afalse'
      )
      .reply(200, {
        items: [
          {
            full_name: 'googleapis/foo',
            default_branch: 'main',
          },
        ],
      })
      .get('/repos/googleapis/foo/pulls?state=open&page=1')
      .reply(200, [
        {
          title: 'feat: foo pull request',
          html_url: 'http://example.com/pr/2',
        },
      ])
      .get('/repos/googleapis/foo/pulls?state=open&page=2')
      .reply(200);
    let retryCount = 0;
    await processPRs(cli, {
      commandName: 'update',
      commandActive: 'updating',
      commandNamePastTense: 'updated',
      commandDesc:
        'Iterates over all PRs matching the regex, and updates them, to the latest on the base branch.',
      processMethod: async (repository: GitHubRepository, pr: PullRequest) => {
        assert.strictEqual(repository.name, 'foo');
        assert.strictEqual(pr.html_url, 'http://example.com/pr/2');
        retryCount++;
        if (retryCount > 2) return true;
        else return false;
      },
    });
    assert.strictEqual(retryCount, 3);
    githubRequests.done();
  });
});
