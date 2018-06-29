#!/usr/bin/env node
'use strict';

import {main as apply} from './apply-change';
import {main as approve} from './approve-prs';
import {main as reject} from './reject-prs';
import {main as check} from './repo-check';
import meow from 'meow';
import updateNotifier from 'update-notifier';
const pkg = require('../../package.json');

updateNotifier({pkg}).notify();

const cli = meow(
  `
	Usage
	  $ repo <command>

	Examples
    $ repo approve /regex/
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
    },
  }
);

if (cli.input.length < 1) {
  cli.showHelp(-1);
}

let p;
switch (cli.input[0]) {
  case 'approve':
    p = approve({
      regex: cli.input[1],
    });
    break;
  case 'reject':
    p = reject({
      regex: cli.input[1],
    });
    break;
  case 'apply':
    p = apply({
      branch: cli.flags.branch,
      message: cli.flags.message,
      comment: cli.flags.comment,
      reviewers: cli.flags.reviewers,
      slient: cli.flags.silent,
      command: cli.input[1],
    });
    break;
  case 'check':
    p = check();
    break;
  default:
    cli.showHelp(-1);
    break;
}
p.catch(console.error);
