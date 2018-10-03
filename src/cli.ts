#!/usr/bin/env node
'use strict';

import {main as apply} from './apply-change';
import {approve} from './approve-prs';
import {reject} from './reject-prs';
import {update} from './update-prs';
import {merge} from './merge-prs';
import {main as check} from './repo-check';
import {sync, exec} from './sync';
import * as meow from 'meow';
import * as updateNotifier from 'update-notifier';
const pkg = require('../../package.json');

updateNotifier({pkg}).notify();

const cli = meow(
    `
	Usage
	  $ repo <command>

	Examples
    $ repo approve /regex/
    $ repo update /regex/
    $ repo merge /regex/
    $ repo reject /regex/
    $ repo apply --branch branch --message message --comment comment [--reviewers username[,username...]] [--silent] command
    $ repo check
    $ repo sync
    $ repo exec -- git status
`,
    {
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
        auto: {type: 'boolean'}
      },
    });

if (cli.input.length < 1) {
  cli.showHelp(-1);
}

let p: Promise<void>;
switch (cli.input[0]) {
  case 'approve':
    p = approve(cli);
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
  case 'check':
    p = check();
    break;
  case 'sync':
    p = sync();
    break;
  case 'exec':
    p = exec(cli);
    break;
  default:
    cli.showHelp(-1);
    break;
}
p!.catch(console.error);
