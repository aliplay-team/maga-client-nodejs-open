#!/usr/bin/env node

'use strict';

const argv = require('minimist')(process.argv.slice(2));
const co = require('co');

if (argv.h || argv.help || !argv.key || !argv.secret) {
  console.log('Usage: maga-cli --key=<key> --secret=<secret> --host=[host] <payload>');
  process.exit(1);
}

const Sdk = require('..');
const maga = new Sdk.Client({
  key: argv.key,
  secret: argv.secret,
  host: argv.host,
});

co(function* () {
  const payload = argv._[0];
  const config = JSON.parse(payload);
  const result = yield maga.request(config);
  console.log(result);
}).catch(err => {
  console.error(err);
});
