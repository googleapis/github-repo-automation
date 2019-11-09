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

import chalk = require('chalk');
import * as fs from 'fs';
import {Writable} from 'stream';

let stream: Writable;
const path = 'repo-debug.log';

export interface LogEntry {
  message: string;
  time: Date;
  level: LogLevel;
}

export enum LogLevel {
  'INFO',
  'WARN',
  'ERROR',
}

export async function log(message: string) {
  console.log(message);
  push(LogLevel.INFO, message);
}

function push(level: LogLevel, message: string) {
  if (!stream) {
    stream = fs.createWriteStream(path);
  }
  stream.write(`${new Date()}\t${level}\t${message}`, err => {
    if (err) {
      console.error('Error writing to log.');
      console.error(err);
    }
  });
}

export function info(message: string) {
  console.error(chalk.cyan(message));
  push(LogLevel.INFO, message);
}

export function warn(message: string) {
  console.error(chalk.yellow(message));
  push(LogLevel.WARN, message);
}

export function error(message: string) {
  console.error(chalk.red(message));
  push(LogLevel.ERROR, message);
}
