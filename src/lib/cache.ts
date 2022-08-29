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

import {existsSync} from 'fs';
import {mkdir, readFile, stat, unlink, writeFile} from 'fs/promises';
import {tmpdir} from 'os';
import {join} from 'path';
import {Mutex} from 'async-mutex';
import {GitHubRepository, Issue, PullRequest} from './github';

const cacheDirectory = join(tmpdir(), 'google-repo-cache');
const cacheMaxAge = 60 * 60 * 1000; // 1 hour

export type CachedData = {issues?: Issue[]; prs?: PullRequest[]};
export type CacheType = 'prs' | 'issues';

const mutex = new Mutex();

async function initCache() {
  if (!existsSync(cacheDirectory)) {
    await mkdir(cacheDirectory);
  }
}

function cacheFilename(repo: GitHubRepository, type: CacheType) {
  const owner = repo.repository.owner.login;
  const name = repo.repository.name;
  return join(
    cacheDirectory,
    `${owner}-${name}`.replace(/\W/g, '-') + `-${type}`
  );
}

export async function readFromCache(repo: GitHubRepository, type: CacheType) {
  const release = await mutex.acquire();
  try {
    await initCache();
    const cacheFile = cacheFilename(repo, type);
    if (!existsSync(cacheFile)) {
      return null;
    }
    const cacheStat = await stat(cacheFile);
    const mtime = cacheStat.mtimeMs ?? cacheStat.ctimeMs;
    const now = Date.now();
    if (now - mtime >= cacheMaxAge) {
      await unlink(cacheFile);
      return null;
    }

    const content = await readFile(cacheFile);
    const json = JSON.parse(content.toString()) as CachedData;
    return json;
  } finally {
    release();
  }
}

export async function saveToCache(
  repo: GitHubRepository,
  type: CacheType,
  data: CachedData
) {
  const release = await mutex.acquire();
  try {
    await initCache();
    const cacheFile = cacheFilename(repo, type);
    if (!data.issues) {
      data.issues = [];
    }
    if (!data.prs) {
      data.prs = [];
    }
    const content = JSON.stringify(data, null, '  ');
    await writeFile(cacheFile, content);
  } finally {
    release();
  }
}

export async function deleteCache(repo: GitHubRepository, type: CacheType) {
  const release = await mutex.acquire();
  try {
    await initCache();
    const cacheFile = cacheFilename(repo, type);
    if (existsSync(cacheFile)) {
      await unlink(cacheFile);
    }
  } finally {
    release();
  }
}
