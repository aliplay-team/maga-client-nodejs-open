'use strict';

const Protocol = require('../lib/protocol');
const assert = require('assert');

describe('test/protocol.test.js', () => {
  const key = 'ngclient#2dcd';
  const secret = 'ali-uc-password-123';
  const protocol = new Protocol();

  describe('encode && decode', () => {
    it('should work', () => {
      const data = { gameName: '名字' };
      const { meta, payload } = protocol.encode({ body: { id: '237727541354', data }, key, secret });
      assert(meta['user-agent']);
      assert(meta['x-mg-agent']);
      assert(meta['x-mg-alg'] === 'AES-128');
      assert(meta['x-mg-appkey'] === key);
      assert(meta['x-mg-sign']);
      assert(meta['x-mg-nonce']);
      assert(meta['x-mg-len']);
      assert(payload.toString('base64') === 'aGkfiL+WVONQf744Gy1KsSuPKEaCyEz5+RXf/v1KeNinjV9NLlzbMfMRYPYaKKjnF1WQAW7gbUC2vALy39U2dA==');

      const responseData = protocol.decode({ meta, payload, key, secret });
      assert.deepEqual(responseData.data, data);
    });

    it('should allow encode empty body', () => {
      const { meta, payload } = protocol.encode({ body: { id: '237727541354' }, key, secret });
      assert(meta['x-mg-sign']);
      assert(payload.toString('base64') === 'aGkfiL+WVONQf744Gy1KsSzOoskkxYcuQ36KeqBbuaI=');
    });

    it('should validate meta when decode', () => {
      const meta = {
        'user-agent': 'maga-client-nodejs-open/v1.0',
        'x-mg-agent': 'server',
        'x-mg-alg': 'AES-128',
        'x-mg-ts': '1493889957087',
        'x-mg-nonce': '01300936',
        'x-mg-appkey': 'invalid keys',
        'x-mg-sign': '533dce075390b6af68c5d739e7046aac',
        'x-mg-len': '64',
      };
      const payload = Buffer.from('aGkfiL+WVONQf744Gy1KsSuPKEaCyEz5+RXf/v1KeNinjV9NLlzbMfMRYPYaKKjnF1WQAW7gbUC2vALy39U2dA==', 'base64');
      assert.throws(() => protocol.decode({ meta, payload, key, secret }), /x-mg-appkey is not match/);
    });

    it('should not validate meta when empty', () => {
      const payload = Buffer.from('aGkfiL+WVONQf744Gy1KsSuPKEaCyEz5+RXf/v1KeNinjV9NLlzbMfMRYPYaKKjnF1WQAW7gbUC2vALy39U2dA==', 'base64');
      const result = protocol.decode({ payload, key, secret });
      assert(result.data.gameName);
    });
  });

  describe('crypto', () => {
    const data = { id: 'xxx', state: { code: '2000000', msg: '操作成功' }, data: { id: 123, gameName: '名字' } };
    const code = 'FqBBqP/kZW2go9aMwDa271Rx7tCQbS1RLKrM66AN7NljZLW6csBpvId/GeAAZXyv8Euat7xmg45Cf+Ib/mZDUZ6whF1NYtsjEUMaw5kmC4enjV9NLlzbMfMRYPYaKKjnF1WQAW7gbUC2vALy39U2dA==';

    it('should encrypt and decrypt', () => {
      const encryptResult = protocol.encrypt(data, secret);
      const decryptResult = protocol.decrypt(encryptResult, secret);
      assert(encryptResult.toString('base64') === code);
      assert(decryptResult === JSON.stringify(data));
    });

    it('should encrypt String|JSON|Buffer', () => {
      assert(protocol.encrypt(data, secret).toString('base64') === code);
      assert(protocol.encrypt(JSON.stringify(data), secret).toString('base64') === code);
      assert(protocol.encrypt(new Buffer(JSON.stringify(data)), secret).toString('base64') === code);
    });

    it('should decrypt String|Buffer', () => {
      assert(protocol.decrypt(Buffer.from(code, 'base64'), secret) === JSON.stringify(data));
      assert(protocol.decrypt(code, secret) === JSON.stringify(data));
    });

    it('encrypt error', () => {
      assert.throws(() => protocol.decrypt(Buffer.from('abc', 'base64'), secret), /wrong final block length/);
    });
  });
});

