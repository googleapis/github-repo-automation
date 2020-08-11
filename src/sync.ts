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

import * as cp from 'child_process';
import * as fs from 'fs';
import * as meow from 'meow';
import {meowFlags} from './cli';
import ora = require('ora');
import Q from 'p-queue';
import * as path from 'path';
import {promisify} from 'util';

import {getConfig} from './lib/config';
import {GitHub} from './lib/github';
import * as logger from './lib/logger';

const mkdir = promisify(fs.mkdir);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const spawn = promisify(cp.exec);

function print(res: {stdout: string; stderr: string}) {
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
export async function sync(cli: meow.Result<typeof meowFlags>) {
  const repos = await getRepos();
  const rootPath = await getRootPath();
  const dirs = await readdir(rootPath);
  const orb = ora('Synchronizing repositories...').start();
  let i = 0;
  const concurrency = cli.flags.concurrency
    ? Number(cli.flags.concurrency)
    : 50;
  const q = new Q({concurrency});
  const proms = repos.map(repo => {
    const cloneUrl = repo.getRepository().ssh_url!;
    const cwd = path.join(rootPath, repo.name);
    return q.add(async () => {
      if (dirs.indexOf(repo.name) !== -1) {
        await spawn(`git reset --hard origin/${repo.baseBranch}`, {cwd});
        await spawn(`git checkout ${repo.baseBranch}`, {cwd});
        await spawn('git fetch origin', {cwd});
        await spawn(`git reset --hard origin/${repo.baseBranch}`, {cwd});
        orb.text = `[${i + 1}/${repos.length}] Synchronized ${repo.name}...`;
      } else {
        await spawn(`git clone ${cloneUrl}`, {cwd: rootPath});
        orb.text = `[${i + 1}/${repos.length}] Cloned ${repo.name}...`;
      }
      i++;
    });
  });
  await Promise.all(proms);
  orb.succeed('Repo sync complete.');
}

export async function exec(cli: meow.Result<typeof meowFlags>) {
  const command = cli.input.slice(1);
  const rootPath = await getRootPath();

  // get all of the subdirectories in ~/.repo.
  const files: string[] = await readdir(rootPath);
  const ps = await Promise.all(
    files.map(async file => {
      file = path.join(rootPath, file);
      const stats = await stat(file);
      return {file, isDirectory: stats.isDirectory()};
    })
  );
  const dirs = ps.filter(x => x.isDirectory).map(x => x.file);

  if (dirs.length === 0) {
    // the user likely hasn't run sync yet.  Lets be nice and do that for them.
    await sync(cli);
  }

  logger.info(`Executing '${command}' in ${dirs.length} directories.`);
  let i = 0;
  const concurrency = cli.flags.concurrency
    ? Number(cli.flags.concurrency)
    : 10;
  const q = new Q({concurrency});
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
  const repos = await github.getRepositories();
  return repos.filter(x => !x.repository.archived);
}

async function getRootPath() {
  const config = await getConfig();
  const repoPath = config.clonePath;
  if (!fs.existsSync(repoPath)) {
    await mkdir(repoPath);
  }
  return repoPath;
}
