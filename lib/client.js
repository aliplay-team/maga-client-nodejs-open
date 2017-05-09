'use strict';

const assert = require('assert');
const Protocol = require('./protocol');
const httpclient = require('./httpclient');
const Logger = require('./logger');

module.exports = class MagaClient {
  /**
   * maga sdk
   * @param {Object} options - init options
   * @param {String} options.key - app key, required
   * @param {String} options.secret - app secret, required
   * @param {String} [options.host] - maga server url, don't end with `/`
   * @param {Number} [options.timeout=5000] - http timeout interval, default to 5000ms
   * @param {Boolean} [options.required=true] - whether throw error when got error or just return error object
   * @param {String} [options.level=INFO] - logger level, default to `INFO`
   * @param {String} [options.prefix] - logger prefix
   * @param {String} [options.logfile] - logger file path
   * @param {Object} [options.logger] - logger instance, see https://github.com/eggjs/egg-logger
   * @param {Object} [options.httpclient] - urllib instance, see https://github.com/node-modules/urllib
   */
  constructor(options) {
    assert(typeof options === 'object', 'options is required');
    assert(options.key, 'options.key is required');
    assert(options.secret, 'options.secret is required');

    this.defaults = Object.assign({
      timeout: 5000,
      required: true,
      host: 'https://wx-maga.aligames.com',
    }, options);

    this.httpclient = options.httpclient || httpclient({
      keepAlive: true,
      freeSocketKeepAliveTimeout: 4000,
      timeout: 30000,
      maxSockets: Infinity,
      maxFreeSockets: 256,
      enableDNSCache: false,
    });

    this.logger = options.logger || new Logger({
      prefix: options.prefix || 'MAGA',
      level: options.level || 'INFO',
      logfile: options.logfile,
    });

    this.protocol = new Protocol({ logger: this.logger });
  }

  /**
   * send request to maga server
   *
   * @example
   * const result = yield sdk.request({
   *   service: '/api/article.basic.list',
   *   data: { gameId: 12345 },
   *   headers: {},
   *   options: {},
   * });
   *
   * console.log(result.data);
   * console.log(result.state);
   * console.log(result.state.rt); // 响应时间
   * console.log(result.error);    // 当有错误的时候返回该节点, 或 `options.required: true` 时抛错
   *
   * @param {Object} config 请求参数 { service, data, headers, options }
   * @param {String} config.service  请求的 api 名称
   * @param {String} [config.url] 后端 URL, 可选, 默认为 host + service
   * @param {Object} [config.data] 请求参数
   * @param {Object} [config.options] 配置信息, 除了后端需要的参数外, 还增加了 timeout 和 required 等额外的控制.
   * @param {Number} [config.options.timeout] 超时时间, 默认为 5 秒
   * @param {Boolean} [config.options.required] 取值 true 时, 当发生错误将抛错; 否则返回带有 error 节点的 result 对象.
   * @return {Object} 查询到的数据, { id, data, state, error }
   */
  * request(config) {
    assert(typeof config === 'object', 'config is required');
    assert(!config.data || typeof config.data === 'object', 'config.data must be object');
    assert(!config.service || config.service.startsWith('/'), 'config.service must startsWith `/`');

    this.logger.debug('prepare request with %j', config);

    const id = config.id = String(config.id || Date.now());
    config.url = config.url || (this.defaults.host + config.service);

    const data = config.data || {};
    data.page = config.page || data.page;

    const { meta, payload } = this.encode({ id, data });
    const headers = Object.assign(config.headers || {}, meta);

    let response;
    try {
      // 发起请求
      this.logger.info('send request to %s', config.url);
      try {
        response = yield this.httpclient.request(config.url, {
          content: payload,
          headers,
          timeout: config.options && config.options.timeout || this.defaults.timeout,
          method: 'POST',
          rejectUnauthorized: false,
        });
      } catch (err) {
        // 网络错误处理: 链接异常（被拒绝/超时/中断)
        err.code = err.status;
        // err.message = 'network error, ' + err.message;
        err.data = config;
        throw err;
      }

      // 网关层错误
      const status = response.status;
      if (status < 200 || status >= 300) {
        let errData;
        try {
          errData = JSON.parse(response.data.toString());
        } catch (err) {
          errData = {
            code: -3,
            message: response.data.toString(),
          };
        }
        const msg = `gateway error, ${errData.message}, url=${config.url}, id=${config.id}`;
        const err = new Error(msg);
        Error.captureStackTrace(err);
        err.name = 'HttpStatusError';
        err.code = errData.code || /* istanbul ignore next */ status;
        err.data = errData;
        throw err;
      }

      // 对响应体进行解包处理
      try {
        // 业务数据解包，作为请求无需校验，故不传递 meta
        const protocolData = this.decode({ payload: response.data });

        this.logger.info('got response: %j', { id: protocolData.id, code: protocolData.code, message: protocolData.message, result: { toJSON: () => '[object Object] hidden at INFO' } });

        assert(String(protocolData.id) === config.id, `response id ${protocolData.id} is not equals request id ${config.id}`);

        // 对返回的响应数据，进行简化处理
        // 网关返回的数据结构为: `{ id, code, message, result }`
        // 其中 code 和 message 是网关层的响应，代码执行到此次，已经代表网关层响应是正常的了，故这几个字段对应用层的业务处理没啥用
        // 为了方便业务应用开发者，我们在这里做下简化处理，仅把 result 节点的数据进行处理返回，即 `{ id, data, state, headers }`，其中 data 和 state 分别是 result.data 和 result.state 。
        const result = {
          id: protocolData.id,
          state: {
            code: protocolData.code || /* istanbul ignore next */ status,
            msg: protocolData.message,
            rt: response.res && response.res.rt,
            size: response.res && response.res.size,
          },
          headers: response.headers,
        };

        if (protocolData.result.state) {
          result.data = protocolData.result.data || {};
          Object.assign(result.state, protocolData.result.state);
        } else {
          // 兼容没有 data 和 state 节点的情况
          result.data = protocolData.result;
          result.state.msg = 'warning: response missing { data, state }';
        }

        this.logger.debug('got response detail: %j', result);

        // 返回结果
        return result;

      } catch (err) {
        // 协议解包出错
        err.name = 'ProtocolDecodeError';
        err.message = 'decode error, ' + err.message;
        err.code = -3;
        err.data = response.data.toString('base64');
        throw err;
      }
    } catch (err) {
      err.id = err.id || config.id;
      // error && required => 抛错
      const required = config.options && config.options.hasOwnProperty('required') ? config.options.required : this.defaults.required;
      this.logger.error('got response err: %j, url: %s', err.message, config.url);
      if (required) {
        throw err;
      }
      // 否则返回错误对象
      return err;
    }
  }


  /**
   * encode to maga protocol
   * @param {Object} body - the data to package, { id, data }
   * @return {Object} - { meta: Object, payload: Buffer }
   * @see Protocol#encode
   */
  encode(body) {
    return this.protocol.encode({
      body,
      key: this.defaults.key,
      secret: this.defaults.secret,
    });
  }

  /**
   * decode from maga protocol
   * @param {Object} target - decode target
   * @param {Buffer} target.payload - the data to unpackage
   * @param {Object} [target.meta] - headers to validate, if not pass, will not validate
   * @return {Object} - result data
   * @see Protocol#decode
   */
  decode({ meta, payload }) {
    return this.protocol.decode({
      meta,
      payload,
      key: this.defaults.key,
      secret: this.defaults.secret,
    });
  }
};
