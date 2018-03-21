## Some examples of using the tool

While we don't have a good documented samples (yet), this folder contains
scripts that were used to solve some problems related to managing multiple
repositories, and can be used as examples of using the library.

### `fix-samples-dependency.sh`

A sample shell script that can be passed to `apply-change.js`. This particular
script uses [jq](https://stedolan.github.io/jq/) tool to validate if the
samples package (`samples/package.json`) depends on the exactly the same version
of the main package as listed in `package.json` (to make sure that when we run
samples tests, we test the current code using `npm link`, and not the code of
some older version downloaded from NPM). The script is called inside the
temporary folder where each repository is cloned, and makes the required
changes, after which the added and modified files will be checked in by
`apply-change.js`.

### `remove-node7.js`

Fix CircleCI configuration `.circleci/config.yml` in all repositories,
removing a job called `node7` from the workflow and job descriptions.
Since `.circleci/config.yml` is YaML, we parse it into object, then fix
it and dump it back.

### `update-branch-protection.js`

Removes the given CI task (`node7` in this example) from the master branch
protection tasks list on GitHub for all our repositories.

### `change-circleci-config-in-branch.js`

An example of fixing the existing file in branch (e.g. apply a quick change
requested in the pull request review).

### `commit-package-lock.js`

An example of applying the change not to one file, but to the whole
cloned repository. The `updateCallback` function takes a path to a folder
where the repository is cloned, and performs requested changes.
The changes are then committed and pull request is sent.

### `setup-nighty-builds.js`

One more example of updating several files at once. This example modifies
`.circleci/config.yml` to add a `nightly` workflow, and changes some jobs.

