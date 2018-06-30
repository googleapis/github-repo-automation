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
 * @fileoverview Promisified version of readline.question.
 */

import * as readline from 'readline';

/**
 * Promisified version of readline question. Prints a prompt and waits for
 * response.
 * @param {string} prompt A prompt to print.
 * @returns {string} Response from stdin.
 */
export async function question(prompt) {
  return new Promise(resolve => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(prompt, response => {
      rl.close();
      resolve(response);
    });
  });
}
