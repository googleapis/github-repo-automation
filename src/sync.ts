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
 * @fileoverview Runs the given command in each repository, and commits
 * files that were added or changed.
 */

'use strict';

import * as util from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as cp from 'child_process';
import * as meow from 'meow';
import {getConfig} from './lib/config';
import {GitHub} from './lib/github';
import * as logger from './lib/logger';
import * as Q from 'p-queue';

const mkdir = util.promisify(fs.mkdir);
const readdir = util.promisify(fs.readdir);
const stat = util.promisify(fs.stat);
const spawn = util.promisify(cp.exec);

function print(res: {stdout: string, stderr: string}) {
  if (res.stdout) {
    console.log(res.stdout);
  }
  if (res.stderr) {
    console.log(res.stderr);
  }
  return res;
}

/**
 * Clone all repositories into ~/.repo.
 * If repo already exists, fetch and reset.
 */
export async function sync() {
  logger.info('Synchronizing repositories...');
  const repos = await getRepos();
  const rootPath = await getRootPath();
  for (let i = 0; i < repos.length; i++) {
    const repo = repos[i];
    const cloneUrl = repo.getRepository().ssh_url!;
    const cwd = path.join(rootPath, repo.name);
    if (fs.existsSync(cwd)) {
      logger.info(`[${i + 1}/${repos.length}] Synchronizing ${repo.name}...`);
      await spawn('git reset --hard origin/master', {cwd});
      await spawn('git checkout master', {cwd});
      await spawn('git fetch origin', {cwd});
      await spawn('git reset --hard origin/master', {cwd});
    } else {
      logger.info(`[${i + 1}/${repos.length}] Cloning ${repo.name}...`);
      await spawn(`git clone ${cloneUrl}`, {cwd: rootPath});
    }
  }
  logger.info('Repo sync complete.');
}

export async function exec(cli: meow.Result) {
  const command = cli.input.slice(1);
  const rootPath = await getRootPath();

  // get all of the subdirectories in ~/.repo.
  const files = await readdir(rootPath);
  const ps = await Promise.all(files.map(async file => {
    file = path.join(rootPath, file);
    const stats = await stat(file);
    return {file, isDirectory: stats.isDirectory()};
  }));
  const dirs = ps.filter(x => x.isDirectory).map(x => x.file);

  if (dirs.length === 0) {
    // the user likely hasn't run sync yet.  Lets be nice and do that for them.
    await sync();
  }

  logger.info(`Executing '${command}' in ${dirs.length} directories.`);
  let i = 0;
  const q = new Q({concurrency: 10});
  const proms = dirs.map(dir => {
    return q.add(() => {
      return spawn(command.join(' '), {cwd: dir})
          .then(r => {
            i++;
            logger.info(`[${i}/${dirs.length}] Executed cmd in ${dir}.`);
            print(r);
          })
          .catch(e => {
            i++;
            logger.error(dir);
            logger.error(e);
          });
    });
  });

  await Promise.all(proms);
  logger.info('Command execution successful.');
}

async function getRepos() {
  const config = await getConfig();
  const github = new GitHub(config);
  return github.getRepositories();
}

async function getRootPath() {
  const config = await getConfig();
  const repoPath = config.clonePath;
  if (!fs.existsSync(repoPath)) {
    await mkdir(repoPath);
  }
  return repoPath;
}
