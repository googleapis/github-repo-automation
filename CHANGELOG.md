# Changelog

[npm history][1]

[1]: https://www.npmjs.com/package/@google/repo?activeTab=versions

### [4.8.1](https://github.com/googleapis/github-repo-automation/compare/v4.8.0...v4.8.1) (2022-04-12)


### Bug Fixes

* approve command requires an --author ([#586](https://github.com/googleapis/github-repo-automation/issues/586)) ([1b1d1c5](https://github.com/googleapis/github-repo-automation/commit/1b1d1c5f530e066dc61227f0e8659beb13f6b5b3))

## [4.8.0](https://github.com/googleapis/github-repo-automation/compare/v4.7.0...v4.8.0) (2022-01-17)


### Features

* delay by default ([#568](https://github.com/googleapis/github-repo-automation/issues/568)) ([2e522e4](https://github.com/googleapis/github-repo-automation/commit/2e522e4ef4ff8b9aad6ce204b5736abe47bab0f2))
* detailed debugging now configured with NODE_DEBUG=repo ([#567](https://github.com/googleapis/github-repo-automation/issues/567)) ([5306b21](https://github.com/googleapis/github-repo-automation/commit/5306b2155387e5d99f199762390aff0baa12ffe8))

## [4.7.0](https://github.com/googleapis/github-repo-automation/compare/v4.6.1...v4.7.0) (2022-01-14)


### Features

* introduce retry and delay configuration ([#563](https://github.com/googleapis/github-repo-automation/issues/563)) ([f08bf08](https://github.com/googleapis/github-repo-automation/commit/f08bf08805a669f94c5d3d6f48de1f829452b877))

### [4.6.1](https://www.github.com/googleapis/github-repo-automation/compare/v4.6.0...v4.6.1) (2021-09-02)


### Bug Fixes

* **build:** switch primary branch to main ([#538](https://www.github.com/googleapis/github-repo-automation/issues/538)) ([45354f2](https://www.github.com/googleapis/github-repo-automation/commit/45354f22f791f24c475ed6ca9f03dd7ed4467b0e))

## [4.6.0](https://www.github.com/googleapis/github-repo-automation/compare/v4.5.0...v4.6.0) (2021-09-02)


### Features

* better logging for approve, extra flag for merge ([#532](https://www.github.com/googleapis/github-repo-automation/issues/532)) ([32260c1](https://www.github.com/googleapis/github-repo-automation/commit/32260c156770720367bd413024f21f466da8eb21))

## [4.5.0](https://www.github.com/googleapis/github-repo-automation/compare/v4.4.1...v4.5.0) (2021-07-08)


### Features

* **list:** allow PRs to be filtered by label ([#519](https://www.github.com/googleapis/github-repo-automation/issues/519)) ([5e4cd3a](https://www.github.com/googleapis/github-repo-automation/commit/5e4cd3ac2a02543345e768e7f491878fa5cc4f16))

### [4.4.1](https://www.github.com/googleapis/github-repo-automation/compare/v4.4.0...v4.4.1) (2021-05-24)


### Bug Fixes

* fetch all branches during sync ([#508](https://www.github.com/googleapis/github-repo-automation/issues/508)) ([5a43559](https://www.github.com/googleapis/github-repo-automation/commit/5a43559d5af32749c0ba295764b8c985583ae947))

## [4.4.0](https://www.github.com/googleapis/github-repo-automation/compare/v4.3.1...v4.4.0) (2021-04-05)


### Features

* add optional branch cleanup to reject command ([#421](https://www.github.com/googleapis/github-repo-automation/issues/421)) ([df75eb2](https://www.github.com/googleapis/github-repo-automation/commit/df75eb2f147ac0b75e9400c05bd3ef19cab80439))

### [4.3.1](https://www.github.com/googleapis/github-repo-automation/compare/v4.3.0...v4.3.1) (2021-02-05)


### Bug Fixes

* **deps:** upgrade to js-yaml 4.0 ([#486](https://www.github.com/googleapis/github-repo-automation/issues/486)) ([62757e8](https://www.github.com/googleapis/github-repo-automation/commit/62757e82fe1b5f8ea92ef4a76111d35b11784544))

## [4.3.0](https://www.github.com/googleapis/github-repo-automation/compare/v4.2.3...v4.3.0) (2021-01-07)


### Features

* add ability to toggle admin enforcement for branch protection ([#475](https://www.github.com/googleapis/github-repo-automation/issues/475)) ([b6cf2df](https://www.github.com/googleapis/github-repo-automation/commit/b6cf2df2c1ae87d4297822d7257bd65fda4ac65f))


### Bug Fixes

* **deps:** update dependency meow to v9 ([#481](https://www.github.com/googleapis/github-repo-automation/issues/481)) ([1ce401b](https://www.github.com/googleapis/github-repo-automation/commit/1ce401b731b630f14bcdfbe15c0fd92a3d6376f0))

### [4.2.3](https://www.github.com/googleapis/github-repo-automation/compare/v4.2.2...v4.2.3) (2020-10-29)


### Bug Fixes

* **deps:** update dependency meow to v8 ([#472](https://www.github.com/googleapis/github-repo-automation/issues/472)) ([7825499](https://www.github.com/googleapis/github-repo-automation/commit/7825499bb6c663609360b36cb26c9d8680cd2d03))

### [4.2.2](https://www.github.com/googleapis/github-repo-automation/compare/v4.2.1...v4.2.2) (2020-10-27)


### Bug Fixes

* **deps:** update dependency gaxios to v4 ([#466](https://www.github.com/googleapis/github-repo-automation/issues/466)) ([2e1d05a](https://www.github.com/googleapis/github-repo-automation/commit/2e1d05a289c3e6c5027bf9832800adabc5a2f03b))

### [4.2.1](https://www.github.com/googleapis/github-repo-automation/compare/v4.2.0...v4.2.1) (2020-10-05)


### Bug Fixes

* **deps:** update dependency update-notifier to v5 ([#458](https://www.github.com/googleapis/github-repo-automation/issues/458)) ([90c4e90](https://www.github.com/googleapis/github-repo-automation/commit/90c4e90796dfb95cfe2375d3fcf9e9d0957fc6d7))

## [4.2.0](https://www.github.com/googleapis/github-repo-automation/compare/v4.1.0...v4.2.0) (2020-08-28)


### Features

* add functionality to remove labels ([#454](https://www.github.com/googleapis/github-repo-automation/issues/454)) ([2cb06b7](https://www.github.com/googleapis/github-repo-automation/commit/2cb06b7174e89aea6d4bbecac7638990afd97c16))

## [4.1.0](https://www.github.com/googleapis/github-repo-automation/compare/v4.0.2...v4.1.0) (2020-08-11)


### Features

* add support for non-master default branches ([#443](https://www.github.com/googleapis/github-repo-automation/issues/443)) ([9785786](https://www.github.com/googleapis/github-repo-automation/commit/9785786db6a9d3d1b07d49b0d565dc3d5d4dd8ea))


### Bug Fixes

* **deps:** update dependency ora to v5 ([#444](https://www.github.com/googleapis/github-repo-automation/issues/444)) ([1a05cdd](https://www.github.com/googleapis/github-repo-automation/commit/1a05cdd4a1017b2ac2773be262279122873b0cb8))

### [4.0.2](https://www.github.com/googleapis/github-repo-automation/compare/v4.0.1...v4.0.2) (2020-07-09)


### Bug Fixes

* typeo in nodejs .gitattribute ([#428](https://www.github.com/googleapis/github-repo-automation/issues/428)) ([caaeb16](https://www.github.com/googleapis/github-repo-automation/commit/caaeb163fcbee6b0241a82a9bac8cf90f8718e2a))

### [4.0.1](https://www.github.com/googleapis/github-repo-automation/compare/v4.0.0...v4.0.1) (2020-07-01)


### Bug Fixes

* allow regex search for branch listing ([#425](https://www.github.com/googleapis/github-repo-automation/issues/425)) ([c706c78](https://www.github.com/googleapis/github-repo-automation/commit/c706c782dd4b3ceb5d1789ab7d1c3bd853685878))

## [4.0.0](https://www.github.com/googleapis/github-repo-automation/compare/v3.0.1...v4.0.0) (2020-06-24)


### ⚠ BREAKING CHANGES

* This PR removes support for using `repos.json` as a source of repositories, and adds support for using GitHub's [repository search API](https://help.github.com/en/github/searching-for-information-on-github/searching-for-repositories) instead. To upgrade to this version of the module, you need to modify your `.repo.yaml` file to use the new config language:

### Features

* use GitHub repo search for identifying repositories ([#418](https://www.github.com/googleapis/github-repo-automation/issues/418)) ([320af6c](https://www.github.com/googleapis/github-repo-automation/commit/320af6cb029685ee2d5b9bdf011c08ef70935ead))

### [3.0.1](https://www.github.com/googleapis/github-repo-automation/compare/v3.0.0...v3.0.1) (2020-06-08)


### Bug Fixes

* push empty commit to trigger release PR ([#411](https://www.github.com/googleapis/github-repo-automation/issues/411)) ([a98d275](https://www.github.com/googleapis/github-repo-automation/commit/a98d275b0ddd470cb2e16daad6728721b4de7a9f))

## [3.0.0](https://www.github.com/googleapis/github-repo-automation/compare/v2.5.0...v3.0.0) (2020-05-14)


### ⚠ BREAKING CHANGES

* rename regex match as --title option (#388)

### Features

* **deps:** update dependency & drop Node 8 ([#384](https://www.github.com/googleapis/github-repo-automation/issues/384)) ([3ecad5e](https://www.github.com/googleapis/github-repo-automation/commit/3ecad5ee821e2d4741d3752b4d9637dc7183ee2a))
* adds support for performing mass operations on issues ([#407](https://www.github.com/googleapis/github-repo-automation/issues/407)) ([0cc958c](https://www.github.com/googleapis/github-repo-automation/commit/0cc958c87af1e749c0c14198d03711f060952ade))
* rename regex match as --title option ([#388](https://www.github.com/googleapis/github-repo-automation/issues/388)) ([410f274](https://www.github.com/googleapis/github-repo-automation/commit/410f27435c43938bf6a7e5b54e7febca225400ad))


### Bug Fixes

* apache license URL ([#468](https://www.github.com/googleapis/github-repo-automation/issues/468)) ([#394](https://www.github.com/googleapis/github-repo-automation/issues/394)) ([5a1cb9c](https://www.github.com/googleapis/github-repo-automation/commit/5a1cb9c14fd7ab27e2142a779d2928d951e37e8a))
* **deps:** update dependency @types/tmp to ^0.2.0 ([#402](https://www.github.com/googleapis/github-repo-automation/issues/402)) ([ebdf1cf](https://www.github.com/googleapis/github-repo-automation/commit/ebdf1cfe6376f9b8706a664649561b5726708934))
* **deps:** update dependency chalk to v4 ([#391](https://www.github.com/googleapis/github-repo-automation/issues/391)) ([044c767](https://www.github.com/googleapis/github-repo-automation/commit/044c76728745cb02a2f6ab308b66af21d2a270c1))
* **deps:** update dependency meow to v7 ([#404](https://www.github.com/googleapis/github-repo-automation/issues/404)) ([897ff19](https://www.github.com/googleapis/github-repo-automation/commit/897ff196c8f2d272a2c83c988fb4a936b8852d73))
* **deps:** update dependency tmp-promise to v3 ([#406](https://www.github.com/googleapis/github-repo-automation/issues/406)) ([c4b4f40](https://www.github.com/googleapis/github-repo-automation/commit/c4b4f40a3bf7a9e66d552ac377798dfa6ad030ae))
* **deps:** update dependency tweetsodium to v0.0.5 ([#395](https://www.github.com/googleapis/github-repo-automation/issues/395)) ([ca44539](https://www.github.com/googleapis/github-repo-automation/commit/ca44539949a7c5994a222108b45da6bc626449f0))

## [2.5.0](https://www.github.com/googleapis/github-repo-automation/compare/v2.4.0...v2.5.0) (2020-03-24)


### Features

* **samples:** add sample demonstrating populating secrets for GitHub… ([#374](https://www.github.com/googleapis/github-repo-automation/issues/374)) ([a71bafd](https://www.github.com/googleapis/github-repo-automation/commit/a71bafd08b543077991265bd88c943bab4c3c1ba))
* add option for filtering by pr author ([#383](https://www.github.com/googleapis/github-repo-automation/issues/383)) ([484ab19](https://www.github.com/googleapis/github-repo-automation/commit/484ab19a07c6183a6fcb7a6e3583546e89cdf8b9))

## [2.4.0](https://www.github.com/googleapis/github-repo-automation/compare/v2.3.0...v2.4.0) (2020-01-28)


### Features

* implement --branch for repo commands ([#357](https://www.github.com/googleapis/github-repo-automation/issues/357)) ([e56839c](https://www.github.com/googleapis/github-repo-automation/commit/e56839c883511df0593dceb31d753e6e74a17ac1))

## [2.3.0](https://www.github.com/googleapis/github-repo-automation/compare/v2.2.2...v2.3.0) (2020-01-06)


### Features

* repo list, and pretty printing PRs ([#346](https://www.github.com/googleapis/github-repo-automation/issues/346)) ([44fd2d2](https://www.github.com/googleapis/github-repo-automation/commit/44fd2d20c32f8f9287328dbb9d70b1fb5b4f9b5d))


### Bug Fixes

* **deps:** update dependency chalk to v3 ([#332](https://www.github.com/googleapis/github-repo-automation/issues/332)) ([aa00d00](https://www.github.com/googleapis/github-repo-automation/commit/aa00d0040e62889fe6ff3cf7619210b6f6fcf414))
* **deps:** update dependency update-notifier to v4 ([#339](https://www.github.com/googleapis/github-repo-automation/issues/339)) ([ef45dc0](https://www.github.com/googleapis/github-repo-automation/commit/ef45dc0027873387693fd75aa09ef37e10184b3f))
* **deps:** use meow v6.0.0 with its own types ([#348](https://www.github.com/googleapis/github-repo-automation/issues/348)) ([573a985](https://www.github.com/googleapis/github-repo-automation/commit/573a98596b8eb82490e5b2b665ed5843b4a8dc0f))

### [2.2.2](https://www.github.com/googleapis/github-repo-automation/compare/v2.2.1...v2.2.2) (2019-10-12)


### Bug Fixes

* **deps:** update dependency ora to v4 ([#326](https://www.github.com/googleapis/github-repo-automation/issues/326)) ([88b2f1e](https://www.github.com/googleapis/github-repo-automation/commit/88b2f1e8e16ec6000e6b078d637f2d5424bce879))

### [2.2.1](https://www.github.com/googleapis/github-repo-automation/compare/v2.2.0...v2.2.1) (2019-08-02)


### Bug Fixes

* set commit title when merging PR ([#310](https://www.github.com/googleapis/github-repo-automation/issues/310)) ([a7b1bb0](https://www.github.com/googleapis/github-repo-automation/commit/a7b1bb0))

## [2.2.0](https://www.github.com/googleapis/github-repo-automation/compare/v2.1.2...v2.2.0) (2019-07-31)


### Features

* make samples/update-branch-protection.js is a flexible CLI ([#303](https://www.github.com/googleapis/github-repo-automation/issues/303)) ([b23c2b7](https://www.github.com/googleapis/github-repo-automation/commit/b23c2b7))

### [2.1.2](https://www.github.com/googleapis/github-repo-automation/compare/v2.1.1...v2.1.2) (2019-07-29)


### Bug Fixes

* **deps:** update dependency command-line-usage to v6 ([#299](https://www.github.com/googleapis/github-repo-automation/issues/299)) ([ab395a9](https://www.github.com/googleapis/github-repo-automation/commit/ab395a9))

### [2.1.1](https://www.github.com/googleapis/github-repo-automation/compare/v2.1.0...v2.1.1) (2019-06-05)


### Bug Fixes

* make other PR commands concurrent ([#289](https://www.github.com/googleapis/github-repo-automation/issues/289)) ([ec70b56](https://www.github.com/googleapis/github-repo-automation/commit/ec70b56))
* **deps:** update dependency axios to ^0.19.0 ([#291](https://www.github.com/googleapis/github-repo-automation/issues/291)) ([913c93c](https://www.github.com/googleapis/github-repo-automation/commit/913c93c))

## [2.1.0](https://www.github.com/googleapis/github-repo-automation/compare/v2.0.1...v2.1.0) (2019-05-29)


### Features

* add the `rename` command ([#284](https://www.github.com/googleapis/github-repo-automation/issues/284)) ([7991585](https://www.github.com/googleapis/github-repo-automation/commit/7991585))

### [2.0.1](https://www.github.com/googleapis/github-repo-automation/compare/v2.0.0...v2.0.1) (2019-05-23)


### Bug Fixes

* **deps:** update dependency tmp-promise to v2 ([#278](https://www.github.com/googleapis/github-repo-automation/issues/278)) ([a7a7b2d](https://www.github.com/googleapis/github-repo-automation/commit/a7a7b2d))
* **deps:** update dependency update-notifier to v3 ([#275](https://www.github.com/googleapis/github-repo-automation/issues/275)) ([d8e9529](https://www.github.com/googleapis/github-repo-automation/commit/d8e9529))

## [2.0.0](https://www.github.com/googleapis/github-repo-automation/compare/v1.1.0...v2.0.0) (2019-05-03)


### Bug Fixes

* stop supporting Node.js v6 ([#270](https://www.github.com/googleapis/github-repo-automation/issues/270)) ([02eb085](https://www.github.com/googleapis/github-repo-automation/commit/02eb085))
* **deps:** update dependency p-queue to v5 ([#261](https://www.github.com/googleapis/github-repo-automation/issues/261)) ([75e5bb6](https://www.github.com/googleapis/github-repo-automation/commit/75e5bb6))


### BREAKING CHANGES

* stop supporting Node.js v6 (#270)

## v1.1.0

04-18-2019 14:47 PDT

### New features
- feat: let user specify concurrency ([#258](https://github.com/googleapis/github-repo-automation/pull/258))
- feat: add `tag` command to apply labels to PRs ([#237](https://github.com/googleapis/github-repo-automation/pull/237))
- feat: repo check Kokoro status enabled, samples code for enabling Kokoro checks ([#183](https://github.com/googleapis/github-repo-automation/pull/183))

### Bug fixes
- fix: log message ([#193](https://github.com/googleapis/github-repo-automation/pull/193))
- fix: repo apply fails when untracked dirs were added ([#188](https://github.com/googleapis/github-repo-automation/pull/188))
- fix(deps): update dependency p-queue to v4 ([#252](https://github.com/googleapis/github-repo-automation/pull/252))
- fix: remove unused packages ([#249](https://github.com/googleapis/github-repo-automation/pull/249))
- fix: update sample for updating status checks ([#202](https://github.com/googleapis/github-repo-automation/pull/202))

### Docs
- docs: update links in contrib guide ([#246](https://github.com/googleapis/github-repo-automation/pull/246))
- docs: update contributing guide ([#242](https://github.com/googleapis/github-repo-automation/pull/242))
- docs: add lint/fix example to contributing guide ([#239](https://github.com/googleapis/github-repo-automation/pull/239))

### Internal changes
- chore(deps): update dependency nyc to v14 ([#262](https://github.com/googleapis/github-repo-automation/pull/262))
- chore: publish to npm using wombat ([#255](https://github.com/googleapis/github-repo-automation/pull/255))
- build: use per-repo publish token ([#254](https://github.com/googleapis/github-repo-automation/pull/254))
- build: Add docuploader credentials to node publish jobs ([#251](https://github.com/googleapis/github-repo-automation/pull/251))
- build: use node10 to run samples-test, system-test etc ([#250](https://github.com/googleapis/github-repo-automation/pull/250))
- build: update release configuration ([#248](https://github.com/googleapis/github-repo-automation/pull/248))
- chore(deps): update dependency mocha to v6 ([#247](https://github.com/googleapis/github-repo-automation/pull/247))
- build: use linkinator for docs test ([#245](https://github.com/googleapis/github-repo-automation/pull/245))
- build: create docs test npm scripts ([#244](https://github.com/googleapis/github-repo-automation/pull/244))
- build: test using @grpc/grpc-js in CI ([#243](https://github.com/googleapis/github-repo-automation/pull/243))
- chore(deps): update dependency eslint-config-prettier to v4 ([#238](https://github.com/googleapis/github-repo-automation/pull/238))
- build: ignore googleapis.com in doc link check ([#236](https://github.com/googleapis/github-repo-automation/pull/236))
- build: check for 404s in the docs ([#235](https://github.com/googleapis/github-repo-automation/pull/235))
- chore(deps): update dependency @types/ora to v3 ([#233](https://github.com/googleapis/github-repo-automation/pull/233))
- chore(deps): update dependency @types/sinon to v7 ([#232](https://github.com/googleapis/github-repo-automation/pull/232))
- chore(build): inject yoshi automation key ([#231](https://github.com/googleapis/github-repo-automation/pull/231))
- chore: update nyc and eslint configs ([#230](https://github.com/googleapis/github-repo-automation/pull/230))
- chore: fix publish.sh permission +x ([#228](https://github.com/googleapis/github-repo-automation/pull/228))
- fix(build): fix Kokoro release script ([#227](https://github.com/googleapis/github-repo-automation/pull/227))
- build: add Kokoro configs for autorelease ([#226](https://github.com/googleapis/github-repo-automation/pull/226))
- chore: always nyc report before calling codecov ([#223](https://github.com/googleapis/github-repo-automation/pull/223))
- chore: nyc ignore build/test by default ([#222](https://github.com/googleapis/github-repo-automation/pull/222))
- chore(build): update prettier config ([#220](https://github.com/googleapis/github-repo-automation/pull/220))
- chore(deps): update dependency @types/sinon to v5.0.7 ([#213](https://github.com/googleapis/github-repo-automation/pull/213))
- chore(build): update CI config ([#217](https://github.com/googleapis/github-repo-automation/pull/217))
- fix(build): fix system key decryption ([#214](https://github.com/googleapis/github-repo-automation/pull/214))
- refactor: drop octokit, just use rest ([#216](https://github.com/googleapis/github-repo-automation/pull/216))
- fix(deps): update dependency @octokit/rest to v16 ([#207](https://github.com/googleapis/github-repo-automation/pull/207))
- chore(deps): update dependency @types/p-queue to v3 ([#209](https://github.com/googleapis/github-repo-automation/pull/209))
- fix: Pin @types/sinon to last compatible version ([#210](https://github.com/googleapis/github-repo-automation/pull/210))
- chore: add a synth.metadata
- chore(deps): update dependency gts to ^0.9.0 ([#205](https://github.com/googleapis/github-repo-automation/pull/205))
- chore: update eslintignore config ([#204](https://github.com/googleapis/github-repo-automation/pull/204))
- chore: use latest npm on Windows ([#203](https://github.com/googleapis/github-repo-automation/pull/203))
- chore: update CircleCI config ([#201](https://github.com/googleapis/github-repo-automation/pull/201))
- chore: include build in eslintignore ([#198](https://github.com/googleapis/github-repo-automation/pull/198))
- chore(deps): update dependency eslint-plugin-node to v8 ([#194](https://github.com/googleapis/github-repo-automation/pull/194))
- chore: update issue templates ([#192](https://github.com/googleapis/github-repo-automation/pull/192))
- chore: remove old issue template ([#190](https://github.com/googleapis/github-repo-automation/pull/190))
- build: run tests on node11 ([#189](https://github.com/googleapis/github-repo-automation/pull/189))
- chores(build): run codecov on continuous builds ([#185](https://github.com/googleapis/github-repo-automation/pull/185))
- chores(build): do not collect sponge.xml from windows builds ([#186](https://github.com/googleapis/github-repo-automation/pull/186))
- chore: update new issue template ([#184](https://github.com/googleapis/github-repo-automation/pull/184))

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
