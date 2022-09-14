#!/usr/bin/env node

// Copyright 2020 Google LLC
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

import {main as apply} from './apply-change.js';
import {list} from './list-prs.js';
import {listIssues} from './list-issues.js';
import {approve} from './approve-prs.js';
import {rename} from './rename-prs.js';
import {reject} from './reject-prs.js';
import {update} from './update-prs.js';
import {merge} from './merge-prs.js';
import {main as check} from './repo-check.js';
import {sync, exec} from './sync.js';
import meow from 'meow';
import {tag} from './tag-prs.js';
import {untag} from './untag-prs.js';
import * as path from 'path';

const cli = meow(
  `
	Usage
	  $ repo <command>

  Examples
    $ repo list [--branch branch] [--author author] [--title title] [--label]
    $ repo list-issues [--branch branch] [--author author] [--title title] [--body body]
    $ repo approve [--branch branch] [--author author] [--title title]
    $ repo update [--branch branch] [--author author] [--title title]
    $ repo merge [--branch branch] [--author author] [--title title] [--yespleasedoit]
    $ repo reject [--branch branch] [--author author] [--title title] [--clean]
    $ repo rename [--branch branch] [--author author] [--title title] 'new PR title'
    $ repo tag [--branch branch] [--author author] [--title title] label1 label2 ...
    $ repo untag [--branch branch] [--author author] [--title title] label1
    $ repo apply --branch branch --message message --comment comment [--reviewers username[,username...]] [--silent] command
    $ repo check
    $ repo sync
    $ repo exec -- git status
    $ repo exec --concurrency 10 -- git status
`,
  {
    importMeta: import.meta,
    flags: {
      branch: {
        type: 'string',
        alias: 'b',
      },
      message: {
        type: 'string',
        alias: 'm',
      },
      comment: {
        type: 'string',
        alias: 'c',
      },
      reviewers: {
        type: 'string',
        alias: 'r',
      },
      silent: {
        type: 'boolean',
        alias: 'q',
      },
      title: {
        type: 'string',
        alias: 't',
      },
      delay: {
        type: 'number',
      },
      retry: {
        type: 'boolean',
      },
      auto: {type: 'boolean'},
      concurrency: {type: 'string'},
      author: {type: 'string'},
      yespleasedoit: {type: 'boolean'},
      nocache: {type: 'boolean'},
    },
  }
);

if (cli.input.length < 1) {
  cli.showHelp(-1);
}

let p: Promise<void>;
switch (cli.input[0]) {
  case 'list':
    p = list(cli);
    break;
  case 'list-issues':
    p = listIssues(cli);
    break;
  case 'approve':
    if (!cli.flags.author) {
      throw new Error('You must pass an --author for the approve command.');
    }
    p = approve(cli);
    break;
  case 'rename':
    p = rename(cli);
    break;
  case 'reject':
    p = reject(cli);
    break;
  case 'update':
    p = update(cli);
    break;
  case 'merge':
    p = merge(cli);
    break;
  case 'apply':
    p = apply(cli);
    break;
  case 'untag':
    p = untag(cli);
    break;
  case 'tag':
    p = tag(cli);
    break;
  case 'check':
    p = check();
    break;
  case 'sync':
    p = sync(cli);
    break;
  case 'exec':
    p = exec(cli);
    break;
  default:
    cli.showHelp(-1);
    break;
}
p!.catch(console.error);
