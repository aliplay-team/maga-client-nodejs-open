'use strict';

/* eslint no-case-declarations: off */

const Sdk = require('..');
const assert = require('assert');
const path = require('path');
const rimraf = require('mz-modules/rimraf');
const sleep = require('mz-modules/sleep');
const fs = require('fs');

describe('test/index.test.js', () => {
  let client;
  const key = 'ngclient#2dcd';
  const secret = 'wqjx0iXcRw2uEXdmjlruzw003';
  const logfile = path.join(__dirname, '.tmp', 'maga.log');

  before(function* () {
    yield rimraf(path.dirname(logfile));

    client = new Sdk.Client({
      key,
      secret,
      consoleLevel: 'INFO',
      level: 'WARN',
      logfile,
    });
  });

  after(() => rimraf(path.dirname(logfile)));

  it('should log to file', function* () {
    const msg = 'test at ' + Date.now();
    client.logger.info('should not log');
    client.logger.error(msg);

    yield sleep(2000);

    const content = fs.readFileSync(logfile, 'utf-8');
    assert(content.replace(/\n/g, '') === msg);
  });
});
