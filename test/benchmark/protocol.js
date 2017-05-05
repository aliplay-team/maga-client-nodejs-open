'use strict';

const Benchmark = require('benchmark');
const benchmarks = require('beautify-benchmark');
const suite = new Benchmark.Suite();

const Protocol = require('../../lib/protocol');
const protocol = new Protocol();

const data = { id: 'xxx', state: { code: '2000000', msg: '操作成功' }, data: { id: 123, gameName: '名字' } };
const real = require('./real.json');
const key = 'ali-uc-password-123';

suite
  .add('encrypt/decrypt simple', () => {
    protocol.decrypt(protocol.encrypt(data, key), key);
  })
  .add('encrypt/decrypt real', () => {
    protocol.decrypt(protocol.encrypt(real, key), key);
  })

  .on('cycle', event => {
    benchmarks.add(event.target);
  })
  .on('start', () => {
    console.log('\n  node version: %s, date: %s\n  Starting...', process.version, Date());
  })
  .on('complete', function done() {
    benchmarks.log();
  })
  .run({ async: false });
