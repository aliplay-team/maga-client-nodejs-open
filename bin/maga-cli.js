#!/usr/bin/env node

'use strict';

const argv = require('minimist')(process.argv.slice(2));
const co = require('co');
const chalk = require('chalk');
const commands = [ 'request', 'encode', 'decode' ];

if (argv.h || argv.help || !argv.key || !argv.secret || !commands.includes(argv._[0])) {
  console.log(`Usage: maga-cli --key=<key> --secret=<secret> --host=[host] --level=INFO [${commands.join('/')}] <payload>`);
  process.exit(1);
}

const Sdk = require('..');
const maga = new Sdk.Client({
  key: argv.key,
  secret: argv.secret,
  host: argv.host,
  level: argv.level,
});

function* request(config) {
  const result = yield maga.request(config);
  console.log(`${chalk.bold.blue('id:')} ${result.id}`);
  console.log(`${chalk.bold.blue('data:')}\n${JSON.stringify(result.data, null, 2).replace(/^/gm, '  ')}`);
  console.log(`${chalk.bold.blue('state:')} ${JSON.stringify(result.state)}`);
  console.log(`${chalk.bold.blue('headers:')}`);
  Object.keys(result.headers).forEach(key => {
    console.log(`  ${key}=${result.headers[key]}`);
  });
}

function* encode(config) {
  config.id = config.id || Date.now();
  const { meta, payload } = maga.encode(config);
  console.log(`${chalk.bold.blue('payload:')} ${payload.toString('base64')}`);
  console.log(`${chalk.bold.blue('headers:')}`);
  Object.keys(meta).forEach(key => {
    console.log(`  ${key}=${meta[key]}`);
  });
}

function* decode(payload) {
  const result = maga.protocol.decode({
    payload,
    key: argv.key,
    secret: argv.secret,
  });
  console.log(`${chalk.bold.blue('result:')}\n${JSON.stringify(result, null, 2).replace(/^/gm, '  ')}`);
}

co(function* () {
  const [ command, payload ] = argv._;

  switch (command) {
    case 'request':
      yield request(JSON.parse(payload));
      break;

    case 'encode':
      yield encode(JSON.parse(payload));
      break;

    case 'decode':
      yield decode(payload);
      break;

    default:
      break;
  }

}).catch(err => {
  console.error(err);
});
