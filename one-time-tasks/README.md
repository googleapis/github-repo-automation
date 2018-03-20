## Some examples of using the tool

While we don't have a good documented samples (yet), this folder contains
scripts that were used to solve some problems related to managing multiple
repositories, and can be used as examples of using the library.

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

