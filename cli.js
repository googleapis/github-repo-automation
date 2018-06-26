#!/usr/bin/env node
'use strict';

const apply = require('./apply-change');
const approve = require('./approve-prs');
const check = require('./repo-check');
const meow = require('meow');

const cli = meow(
  `
	Usage
	  $ repo <command>

	Examples
    $ repo approve /regex/
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
    p = approve.main({
      regex: cli.input[1],
    });
    break;
  case 'apply':
    p = apply.main({
      branch: cli.flags.branch,
      message: cli.flags.message,
      comment: cli.flags.comment,
      reviewers: cli.flags.reviewers,
      slient: cli.flags.silent,
      command: cli.input[1],
    });
    break;
  case 'check':
    p = check.main();
    break;
  default:
    cli.showHelp(-1);
    break;
}
p.catch(console.error);
