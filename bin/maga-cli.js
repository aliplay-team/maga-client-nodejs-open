#!/usr/bin/env node

'use strict';

const argv = require('minimist')(process.argv.slice(2));
const co = require('co');
const chalk = require('chalk');

if (argv.h || argv.help || !argv.key || !argv.secret) {
  console.log('Usage: maga-cli --key=<key> --secret=<secret> --host=[host] --level=INFO <payload>');
  process.exit(1);
}

const Sdk = require('..');
const maga = new Sdk.Client({
  key: argv.key,
  secret: argv.secret,
  host: argv.host,
  level: argv.level,
});

co(function* () {
  const payload = argv._[0];
  const config = JSON.parse(payload);
  const result = yield maga.request(config);
  console.log(`${chalk.bold.blue('id:')} ${result.id}`);
  console.log(`${chalk.bold.blue('data:')}\n${JSON.stringify(result.data, null, 2).replace(/^/gm, '  ')}`);
  console.log(`${chalk.bold.blue('state:')} ${JSON.stringify(result.state)}`);
  console.log(`${chalk.bold.blue('headers:')}`);
  Object.keys(result.headers).forEach(key => {
    console.log(`  ${key}=${result.headers[key]}`);
  });
}).catch(err => {
  console.error(err);
});
