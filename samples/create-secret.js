// Copyright 2018 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Adds a collaborator to all repositories.
 */

'use strict';

const {getConfig} = require('../build/src/lib/config');
const {GitHub} = require('../build/src/lib/github.js');
const sodium = require('tweetsodium');
const meow = require('meow');
const {TextEncoder} = require('text-encoding-shim');

/** Main function.
 */
async function main() {
  const cli = meow(
    `
    Usage
      $ node ./samples/create-secret.js key secret
  `,
    {}
  );

  if (cli.input.length < 2) {
    return cli.showHelp(-1);
  }
  const [key, secret] = cli.input;
  const config = await getConfig();
  const github = new GitHub(config);
  const repos = await github.getRepositories();
  let index = 0;
  for (const repository of repos) {
    const publicKey = (
      await github.client.get(
        `/repos/${repository.repository.owner.login}/${repository.repository.name}/actions/secrets/public-key`
      )
    ).data;
    const encoder = new TextEncoder();
    const messageBytes = encoder.encode(secret);
    const encoded = sodium.seal(
      messageBytes,
      Buffer.from(publicKey.key, 'base64')
    );
    await github.client.put(
      `/repos/${repository.repository.owner.login}/${repository.repository.name}/actions/secrets/${key}`,
      {
        encrypted_value: Buffer.from(encoded).toString('base64'),
        key_id: publicKey.key_id,
      }
    );
    console.log(
      `${repository.name}: [.] creating secret repository (${index} of ${repos.length} repositories completed)`
    );
    ++index;
  }

  console.log(`${repos.length} repositories completed`);
}

main().catch(err => {
  console.error(err.toString());
});
