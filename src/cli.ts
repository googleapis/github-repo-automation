#!/usr/bin/env node
'use strict';

import {main as apply} from './apply-change';
import {main as approve} from './approve-prs';
import {main as reject} from './reject-prs';
import {main as check} from './repo-check';
import * as meow from 'meow';
import * as updateNotifier from 'update-notifier';
const pkg = require('../../package.json');

updateNotifier({pkg}).notify();

const cli = meow(
    `
	Usage
	  $ repo <command>

	Examples
    $ repo approve /regex/ [--auto]
    $ repo reject /regex/
    $ repo apply --branch branch --message message --comment comment [--reviewers username[,username...]] [--silent] command
    $ repo check
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
  case 'apply':
    p = apply(cli);
    break;
  case 'check':
    p = check();
    break;
  default:
    cli.showHelp(-1);
    break;
}
p!.catch(console.error);
