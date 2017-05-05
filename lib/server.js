'use strict';

const assert = require('assert');
const Protocol = require('./protocol');
const Logger = require('./logger');

module.exports = class MagaServer {
  /**
   * maga sdk
   * @param {Object} options - init options
   * @param {Object} [options.keystore] - key-secret store, required
   * @param {String} [options.prefix] - logger prefix
   * @param {String} [options.level=INFO] - logger level, default to `INFO`
   * @param {Object} [options.logger] - logger instance, see https://github.com/eggjs/egg-logger
   */
  constructor(options) {
    assert(typeof options === 'object', 'options is required');
    assert(typeof options.keystore === 'object', 'options.keystore is required');

    this.keystore = options.keystore;
    this.logger = options.logger || new Logger({ prefix: options.prefix || 'MAGA SERVER', level: options.level || 'INFO' });
    this.protocol = new Protocol({ logger: this.logger });
  }

  /**
   * decode from maga protocol
   *
   * @param {Buffer} payload - the data to unpackage
   * @param {Object} [meta] - headers to validate, if not pass, will not validate
   * @return {Object} - result data, { meta, payload }
   * @see Protocol#decode
   */
  decode({ meta, payload }) {
    const key = meta['x-mg-appkey'];
    assert(key, 'x-mg-appkey is required at meta');
    assert(typeof meta === 'object', 'meta headers is required');
    assert(payload, 'payload is required');

    // find secret at keystore, will throw error when not found
    const secret = this.getSecret(key);

    try {
      // 解包客户端发送的请求数据 { id, data }
      const result = this.protocol.decode({ meta, payload, key, secret });
      if (!result.id) {
        throw new Error('id is required');
      }
      return result;
    } catch (err) {
      err.name = 'ProtocolDecodeError';
      err.message = 'decode error, ' + err.message;
      err.code = 400;
      err.data = {
        meta: {
          'x-mg-code': err.code,
        },
        payload: {
          // id:
          code: err.code,
          message: err.message,
        },
      };
      throw err;
    }
  }

  /**
   * 打包响应数据，生成 headers 和 body buffer
   * @param {Object} result - 需要返回给用户的数据，将赋值给 result 节点
   * @param {String} key - 用来加密的 key，将会去 keystore 查询对应的 secret
   * @param {String} id - 请求 ID
   * @param {String} [code] - 请求结果，默认为 200
   * @param {String} [msg] - 状态信息，可选
   * @return {Object} - { meta: Object, payload: Buffer }
   */
  response({ key, result, id, code = 200, msg = '业务执行成功' }) {
    assert(id, 'id is required, should pass request id');

    const body = {
      id,
      code,
      message: msg,
      result,
    };
    this.logger.info('prepare response to client: %j', { id, code, msg, result: { toJSON: () => '[object Object] hidden at INFO' } });
    this.logger.debug('origin response: %j', body);

    // find secret at keystore, will throw error when not found
    const secret = this.getSecret(key);
    const response = this.protocol.encode({
      body,
      key,
      secret,
    });
    response.meta['x-mg-code'] = code;

    /* istanbul ignore next */
    this.logger.debug('send response to client: payload: %j, meta: %j', { toJSON: () => response.payload.toString('base64') }, response.meta);
    return response;
  }

  getSecret(key) {
    // find secret at keystore
    const secret = this.keystore[key];
    if (!secret) {
      this.logger.error('key %s not found at keystore', key);
      const err = new Error('app key permission denied');
      err.code = 403;
      err.name = 'PermissionError';
      err.data = {
        meta: {
          'x-mg-code': err.code,
        },
        payload: {
          // id:
          code: err.code,
          message: err.message,
        },
      };
      throw err;
    }
    return secret;
  }
};
