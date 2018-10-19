# Changelog

[npm history][1]

[1]: https://www.npmjs.com/package/@google/repo?activeTab=versions

## v1.0.0

### Fixes
- fix: `repo apply` command ([#179](https://github.com/googleapis/github-repo-automation/pull/179))
- fix: repair repo sync ([#154](https://github.com/googleapis/github-repo-automation/pull/154))

### New Features
- feat: split the approve command ([#164](https://github.com/googleapis/github-repo-automation/pull/164))

### Internal / Testing Changes
- build: fix codecov uploading on Kokoro ([#178](https://github.com/googleapis/github-repo-automation/pull/178))
- chore(deps): update dependency sinon to v7 ([#177](https://github.com/googleapis/github-repo-automation/pull/177))
- chore(deps): update dependency @types/meow to v5 ([#165](https://github.com/googleapis/github-repo-automation/pull/165))
- Update kokoro config ([#163](https://github.com/googleapis/github-repo-automation/pull/163))
- chore(deps): update dependency eslint-plugin-prettier to v3 ([#162](https://github.com/googleapis/github-repo-automation/pull/162))
- Update CI config ([#160](https://github.com/googleapis/github-repo-automation/pull/160))
- Don't publish sourcemaps ([#158](https://github.com/googleapis/github-repo-automation/pull/158))
- Re-generate library using /synth.py ([#157](https://github.com/googleapis/github-repo-automation/pull/157))
- Update kokoro config ([#156](https://github.com/googleapis/github-repo-automation/pull/156))
- test: remove appveyor config ([#155](https://github.com/googleapis/github-repo-automation/pull/155))
- Update kokoro config ([#153](https://github.com/googleapis/github-repo-automation/pull/153))
- Enable prefer-const in the eslint config ([#152](https://github.com/googleapis/github-repo-automation/pull/152))

## v0.3.0

### Features
- feat: print report after repo approve ([#148](https://github.com/googleapis/github-repo-automation/pull/148))
- feat: load repositories from sloth JSON config ([#143](https://github.com/googleapis/github-repo-automation/pull/143))
- feat: make repo exec async ([#111](https://github.com/googleapis/github-repo-automation/pull/111))
- feat: delete branch after approving and merging ([#116](https://github.com/googleapis/github-repo-automation/pull/116))

### Bug Fixes
- fix: make repo-check work ([#149](https://github.com/googleapis/github-repo-automation/pull/149))
- fix: actually delete branch ([#147](https://github.com/googleapis/github-repo-automation/pull/147))
- fix: proper ssh_url for github repos from json ([#145](https://github.com/googleapis/github-repo-automation/pull/145))
- fix: properly delete branch by git reference ([#139](https://github.com/googleapis/github-repo-automation/pull/139))
- fix: clone if dir does not exist ([#128](https://github.com/googleapis/github-repo-automation/pull/128))
- fix: update compilation errors due to new octokit ([#129](https://github.com/googleapis/github-repo-automation/pull/129))
- fix: speed up sync ([#121](https://github.com/googleapis/github-repo-automation/pull/121))
- fix: do not include archived repos ([#119](https://github.com/googleapis/github-repo-automation/pull/119))
- fix: repo apply CLI should not accept --execute/--command ([#115](https://github.com/googleapis/github-repo-automation/pull/115))

## Keepin' the lights on
- Enable no-var in eslint ([#146](https://github.com/googleapis/github-repo-automation/pull/146))
- chore(deps): update dependency nock to v10 ([#144](https://github.com/googleapis/github-repo-automation/pull/144))
- Update CI config ([#142](https://github.com/googleapis/github-repo-automation/pull/142))
- Fix sample tests ([#141](https://github.com/googleapis/github-repo-automation/pull/141))
- Retry npm install in CI ([#137](https://github.com/googleapis/github-repo-automation/pull/137))
- Update CI config ([#135](https://github.com/googleapis/github-repo-automation/pull/135))
- fix(deps): update dependency p-queue to v3 ([#134](https://github.com/googleapis/github-repo-automation/pull/134))
- chore(deps): update dependency nyc to v13 ([#133](https://github.com/googleapis/github-repo-automation/pull/133))
- add (dummy) system-test key ([#132](https://github.com/googleapis/github-repo-automation/pull/132))
- Add and run synth file ([#130](https://github.com/googleapis/github-repo-automation/pull/130))
- chore(deps): update dependency eslint-config-prettier to v3 ([#127](https://github.com/googleapis/github-repo-automation/pull/127))
- chore(deps): update dependency assert-rejects to v1 ([#125](https://github.com/googleapis/github-repo-automation/pull/125))
- chore: ignore package-lock.json ([#124](https://github.com/googleapis/github-repo-automation/pull/124))
- chore(deps): lock file maintenance ([#123](https://github.com/googleapis/github-repo-automation/pull/123))
- chore: use CircleCI for publish ([#109](https://github.com/googleapis/github-repo-automation/pull/109))
- chore: update renovate config ([#122](https://github.com/googleapis/github-repo-automation/pull/122))
- chore: throw on deprecation ([#120](https://github.com/googleapis/github-repo-automation/pull/120))
- chore(deps): lock file maintenance ([#118](https://github.com/googleapis/github-repo-automation/pull/118))
- chore(deps): update dependency typescript to v3 ([#117](https://github.com/googleapis/github-repo-automation/pull/117))
- chore: assert.deelEqual => assert.deepStrictEqual ([#114](https://github.com/googleapis/github-repo-automation/pull/114))
- chore: move mocha options to mocha.opts ([#110](https://github.com/googleapis/github-repo-automation/pull/110))

