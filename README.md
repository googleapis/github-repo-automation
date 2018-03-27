## Tools to automate managing multiple github repositories.

[![Greenkeeper badge](https://badges.greenkeeper.io/googleapis/github-repo-automation.svg)](https://greenkeeper.io/)

**This is not an officially supported Google product.**

As we publish Node.js client libraries to multiple repositories under
[googleapis](https://github.com/googleapis/), we need a set of small
tools to perform management of those repositories, such as updating
continuous integration setup, updating dependencies, and so on.

This repository contains some scripts that may be useful for this kind
of tasks.

## List of tools included

If you're not familiar with Node.js development you can still
use the tools included as they don't require writing any Javascript
code. Before running the scripts, make sure you have Node.js version 8+
installed (e.g. from [here](https://nodejs.org/en/)) and available in
your `PATH`, and install the required dependencies:

```sh
npm install
```

You need to make your own `config.yaml` and put your GitHub token there:
```sh
cp config.yaml.default config.yaml
vim config.yaml
```

Now you are good to go!

### `approve-prs.js`

`node approve-prs.js [regex]`

Iterates over all open pull requests matching `regex` (all PRs if
no regex is given) in all configured repositories.
For each pull request, asks (in console) if it should be approved
and merged. Useful for managing GreenKeeper's PRs:

`node approve-prs.js 🚀`

or all PRs with the word `test` in the title:

`node approve-prs.js test`

### `apply-change.js`

```sh
node apply-change.js --branch branch --message message
                     --comment comment [--reviewers username[,username...]]
                     [--silent] command
```

Iterates over all configured repositories, clones each of them into
a temporary folder, and runs `command` to apply any changes you need.
After `command` is run, `git status` is executed and all added and
changed files are committed into a new branch `branch` with commit message
`message`, and then a new pull request is created with comment `comment`
and the given list of reviewers.

Please note that because of GitHub API [does not
support](https://github.com/isaacs/github/issues/199) inserting multiple files
into one commit, each file will be committed separately. It can be fixed by
changing this library to use the low-level
[Git data API](https://developer.github.com/v3/git/),
your contributions are welcome!

### `repo-check.js`

`node repo-check.js`

Iterates all configured repositories and checks that each repository
is configured properly (branch protection, continuous integration,
valid `README.md`, etc.).

## List of libraries

The tools listed above use the following libraries available in `lib/` folder.
Feel free to use them directly from your JavaScript code if you need more
flexibility than provided by the tools. The files in `samples/` folder
can serve as samples that show library usage.

### `lib/update-repo.js`

Iterates over all configured repositories, clones each of them into
a temporary folder, and calls the provided function to apply any changes you
need. The function must return a promise resolving to the list of files to
create or modify. These files are committed into a new branch with the given
commit message, and then a new pull request is created with the given comment
and the given list of reviewers.

Please note that because of GitHub API [does not
support](https://github.com/isaacs/github/issues/199) inserting multiple files
into one commit, each file will be committed separately. It can be fixed by
changing this library to use the low-level
[Git data API](https://developer.github.com/v3/git/),
your contributions are welcome!

```js
const updateRepo = require('./lib/update-repo.js');

async function callbackFunction(repoPath) {
  // make any changes to the cloned repo in repoPath
  let files = ['path/to/updated/file', 'path/to/new/file'];
  return Promise.resolve(files);
}

async function example() {
  await updateRepo({
    updateCallback: callbackFunction,
    branch: 'new-branch',
    message: 'commit message',
    comment: 'pull request comment',
    reviewers: ['github-username1', 'github-username2'],
  });
}
```

### `lib/update-file.js`

A function that applies the same fix to one file in all configured
repositories, and sends pull requests (that can be approved and merged
later by `approve-pr.js` or manually). Useful if you need to make
the same boring change to all the repositories, such as change some
configuration file in a certain way.

```js
const updateFile = require('./lib/update-file.js');

function callbackFunction(content) {
  let newContent = content;
  // make any changes to file content
  return newContent;
}

async function example() {
  await updateFile({
    path: 'path/to/file/in/repository',
    patchFunction: callbackFunction,
    branch: 'new-branch',
    message: 'commit message',
    comment: 'pull request comment',
    reviewers: ['github-username1', 'github-username2'],
  });
}
```

### `lib/update-file-in-branch.js`

A function that does pretty much the same, but to the file in the
given branch in all configured repositories, and does not send any
pull requests. Useful if you created a bunch of PRs using `update-file.js`, but
then decided to apply a quick change in all created branches.

```js
const updateFileInBranch = require('./lib/update-file-in-branch.js');

function callbackFunction(content) {
  let newContent = content;
  // make any changes to file content
  return newContent;
}

async function example() {
  await updateFileInBranch({
    path: 'path/to/file/in/repository',
    patchFunction: callbackFunction,
    branch: 'existing-branch',
    message: 'commit message',
  });
}
```

### Other files in `lib/`

#### `lib/github.js`

A simple wrapper to GitHub client API
([@octokit/rest](https://github.com/octokit/rest.js)) that at least lets you
pass less parameters to each API call.

#### `lib/circleci.js`

A simple wrapper to [CircleCI API](https://circleci.com/docs/api/v1-reference/).

#### `lib/question.js`

A promisified version of `readline.question` to provide some primitive
interaction.
