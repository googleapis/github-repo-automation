## Tools to automate managing multiple github repositories.

**This is not an officially supported Google product.**

As we publish Node.js client libraries to multiple repositories under
[googleapis](https://github.com/googleapis/), we need a set of small
tools to perform management of those repositories, such as updating
continuous integration setup, updating dependencies, and so on.

This repository contains some scripts that may be useful for this kind
of tasks.

## List of tools and libraries included

If you're not familiar with Node.js development you can still
use `approve-pr.js` as it does not require writing any Javascript
code. Before running the script, make sure you have Node.js version 8+
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

### `approve-pr.js`

`node approve-pr.js [regex]`

Iterates over all open pull requests matching `regex` (all PRs if
no regex is given) in all configured repositories.
For each pull request, asks (in console) if it should be approved
and merged. Useful for managing GreenKeeper's PRs:

`node approve-pr.js 🚀`

### `repo-check.js`

`node repo-check.js`

Iterates all configured repositories and checks that each repository
is configured properly (branch protection, continuous integration,
valid `README.md`, etc.).

### `lib/update-file.js`

A function that applies the same fix to one file in all configured
repositories, and sends pull requests (that can be approved and merged
later by `approve-pr.js` or manually). Useful if you need to make
the same boring change to all the repositories, such as change some
configuration file in a certain way.

### `lib/update-file-in-branch.js`

A function that does pretty much the same, but to the file in the
given branch in all configured repositories, and does not send any
pull requests.

### `lib/update-repo.js`

Similar to `update-file.js`, but instead of updating just one file,
lets you make any changes to any number of files, and commits the
changes.

#### `lib/github.js`, `lib/circleci.js`

Wrappers to GitHub client API
([@octokit/rest](https://github.com/octokit/rest.js)) and
[CircleCI API](https://circleci.com/docs/api/v1-reference/) that
are used by other scripts.
