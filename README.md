<img src="https://avatars0.githubusercontent.com/u/1342004?v=3&s=96" alt="Google Inc. logo" title="Google" align="right" height="96" width="96"/>

# GitHub Repo Automation
> A set of tools to automate multiple GitHub repository management.

**This is not an officially supported Google product.**

As we publish Node.js client libraries to multiple repositories under
[googleapis](https://github.com/googleapis/), we need a set of small
tools to perform management of those repositories, such as updating
continuous integration setup, updating dependencies, and so on.

This repository contains some scripts that may be useful for this kind
of tasks.

## Installation

**Googlers**: You should install this tool on your laptop
or workstation, as folks have run into timeout issues when using
a Google Cloud Compute Engine instance.

If you're not familiar with Node.js development you can still
use the tools included as they don't require writing any Javascript
code. Before running the scripts, make sure you have Node.js version 8+
installed (e.g. from [here](https://nodejs.org/en/)) and available in
your `PATH`, and install the required dependencies:

```sh
$ npm install -g @google/repo
```

You need to make your own [`config.yaml`](https://github.com/googleapis/github-repo-automation/blob/main/config.yaml.default) and put your GitHub token there. Example:

```
githubToken: your-github-token
clonePath: /User/beckwith/.repo # optional
repoSearch: org:googleapis language:typescript language:javascript is:public archived:false
```

The `repoSearch` field uses the [GitHub Repository Search syntax](https://help.github.com/en/github/searching-for-information-on-github/searching-for-repositories).

You can set the path to the config file with the `REPO_CONFIG_PATH` environment variable:

```sh
$ echo $REPO_CONFIG_PATH
/User/beckwith/config.yaml
```

Now you are good to go!

## Usage

### PR based workflows

The following commands operate over a collection of PRs.

#### repo approve

```sh
$ repo approve [--title title]
```

Iterates over all open pull requests matching `title` (this can be a regex,
and all PRs will be processed if no regex for title is given) in all configured repositories.
For each pull request, asks (in console) if it should be approved
and merged. Useful for managing GreenKeeper's PRs:

`$ repo approve 🚀`

or all PRs with the word `test` in the title:

`$ repo approve test`

#### repo list

```sh
$ repo list [--title title]
```

Iterates over all open pull requests matching `title` (this can be a regex,
and all PRs will be processed if no regex for title is given)
in all configured repositories, and prints them.

`$ repo list --title 🚀`

or all PRs with the word `test` in the title:

`$ repo list --title test`

#### repo reject

```sh
$ repo reject [--title title] [--clean]
```

Iterates over all open pull requests matching `title` (this can be a regex,
and all PRs will be processed if no regex for title is given) and closes
them. For example, close all PRs with the word `test` in the title:

`$ repo reject --title test`

If `--clean` is specified, the branch associated with the PR will also be deleted. Branches on forked PRs will be ignored.

#### repo rename

```sh
$ repo rename --title title 'new title'
```

Iterates over all open pull requests matching `title` (this can be a regex,
and all PRs will be processed if no regex for title is given), and renames
them.

#### repo apply

```sh
$ repo apply --branch branch
             --message message
             --comment comment
             [--reviewers username[,username...]]
             [--silent]
             command
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

#### repo check

```sh
$ repo check
```

Iterates all configured repositories and checks that each repository
is configured properly (branch protection, continuous integration,
valid `README.md`, etc.).

### Repository based workflows
In some cases, you may want to clone all of the repositories that match a given filter, and perform operations over them all locally.

#### repo sync
To clone or reset all repositories in a given filter set, run:

```sh
$ repo sync
```

This will clone all repositories in the configured `clonePath`.  From there, you can open the entire codebase in your favorite editor, and make changes.

#### repo exec
After cloning all repositories and making a set of batch changes, you will likely want to commit those changes, push upstream, and submit a pull request.  For these, you can use `repo exec`.  This command executes a given command over every cloned repository brought in via `repo sync`:

```sh
$ repo exec -- git status
```

For example - to go through a typical PR workflow, you would run:

```sh
$ repo exec -- git checkout -b my-branch-name
$ repo exec -- git add -A
$ repo exec -- git commit -m \"chore: do something fun\"
$ repo exec -- git push origin my-branch-name
$ repo exec --concurrency 1 -- gh pr create --fill
```

The `gh` tool referenced above uses https://cli.github.com/, and the `--concurrency` flag allows you to control how many pull requests are sent to the GitHub API at once.  This is useful if you run into rate limiting or abuse errors.

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

#### `lib/question.js`

A promisified version of `readline.question` to provide some primitive
interaction.
