'use strict';

const assert = require('assert');
const md5 = require('md5');
const is = require('is-type-of');
const crypto = require('crypto');
const Logger = require('./logger');
const ALGORITHM_KEY = 'sha256';
const ALGORITHM = 'aes-128-ecb';

class MagaProtocol {
  constructor(options = {}) {
    this.logger = options.logger || new Logger({ prefix: 'MAGA' });
  }

  /**
   * encode to maga protocol
   * @param {Object} body - the data to package, { id, data }
   * @param {String} key - app key
   * @param {String} secret - app secret
   * @return {Object} - { meta: Object, payload: Buffer }
   */
  encode({ body, key, secret }) {
    assert(body, 'body is required');
    assert(body.id, 'body.id is required');

    const ts = Date.now();
    const nonce = getRandomId(8);
    const sign = md5(key + nonce + ts + JSON.stringify(body.data || {}) + secret);

    this.logger.debug('encode input: %j', body);

    const payload = this.encrypt(JSON.stringify(body), secret);
    const meta = {
      'user-agent': 'maga-client-nodejs-open/v1.0',
      'x-mg-agent': 'server',
      'x-mg-alg': 'AES-128',
      'x-mg-ts': String(ts),
      'x-mg-nonce': nonce,
      'x-mg-appkey': key,
      'x-mg-sign': sign,
      'x-mg-len': String(payload.length),
    };

    /* istanbul ignore next */
    this.logger.debug('encode output: %j, meta: %j', { toJSON: () => payload.toString('base64') }, meta);

    return { meta, payload };
  }

  /**
   * decode from maga protocol
   * @param {Buffer} payload - the data to unpackage
   * @param {Object} [meta] - headers to validate, if not pass, will not validate
   * @param {String} key - app key
   * @param {String} secret - app secret
   * @return {Object} - result data
   */
  decode({ meta, payload, key, secret }) {
    /* istanbul ignore next */
    this.logger.debug('decode input: %j', { toJSON: () => payload.toString('base64') });

    const data = JSON.parse(this.decrypt(payload, secret));

    if (meta) {
      assert(meta['x-mg-alg'] === 'AES-128', 'x-mg-alg only support AES-128');
      assert(meta['x-mg-appkey'] === key, 'x-mg-appkey is not match');
      assert(meta['x-mg-nonce'], 'x-mg-nonce is required');
      assert(meta['x-mg-ts'], 'x-mg-ts is required');
      assert(String(meta['x-mg-len']) === String(payload.length), 'x-mg-len is not match');

      const sign = md5(key + meta['x-mg-nonce'] + meta['x-mg-ts'] + JSON.stringify(data.data) + secret);
      assert(meta['x-mg-sign'] === sign, 'x-mg-sign is not match');
    }

    this.logger.debug('decode output: %j', data);

    return data;
  }

  /**
   * encrypt input data with ase128
   * @param {String|JSON|Buffer} input - data to encrypt
   * @param {String} secret - secret key
   * @return {Buffer} encrypt result buffer
   * @private
   */
  encrypt(input, secret) {
    assert(input, 'input is required');
    assert(secret, 'secret key is required');

    if (!is.buffer(input)) {
      if (typeof input === 'object') {
        input = JSON.stringify(input);
      }
      input = new Buffer(input);
    }
    // this.logger.debug('encrypt input: %j', { toJSON: () => input.toString('base64') });

    const sha = crypto.createHash(ALGORITHM_KEY);
    sha.update(secret);
    const pwd = sha.digest().slice(0, 16);

    const cipher = crypto.createCipheriv(ALGORITHM, pwd, '');
    const result = Buffer.concat([ cipher.update(input), cipher.final() ]);
    // this.logger.debug('encrypt output: %j', { toJSON: () => result.toString('base64') });
    return result;
  }

  /**
   * decrypt result data with ase128 to plain string
   * @param {String|Buffer} data - result data, support base64 string.
   * @param {String} secret - secret key
   * @return {String} decrypt result string
   * @private
   */
  decrypt(data, secret) {
    assert(data, 'data is required');
    assert(secret, 'secret key is required');

    if (is.string(data)) {
      data = Buffer.from(data, 'base64');
    }

    // this.logger.debug('decrypt input: %j', { toJSON: () => data.toString('base64') });

    const sha = crypto.createHash(ALGORITHM_KEY);
    sha.update(secret);
    const pwd = sha.digest().slice(0, 16);

    const cipher = crypto.createDecipheriv(ALGORITHM, pwd, '');
    const result = Buffer.concat([ cipher.update(data), cipher.final() ]).toString();
    // this.logger.debug('decrypt output: %s', result);
    return result;
  }
}

/**
 * gen random id
 * @param {Number} len - string length
 * @return {String}  random string with special length
   * @private
 */
function getRandomId(len) {
  let random = '';
  for (let i = 0; i < len; i++) {
    random += Math.floor(Math.random() * 10);
  }
  return random;
}

module.exports = MagaProtocol;
