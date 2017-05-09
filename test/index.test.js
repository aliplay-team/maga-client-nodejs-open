'use strict';

/* eslint no-case-declarations: off */

const Sdk = require('..');
const assert = require('assert');
const mm = require('mm');
const utils = require('./test-utils');

describe('test/index.test.js', () => {
  let client;
  let server;
  let localServer;
  const key = 'ngclient#2dcd';
  const secret = 'wqjx0iXcRw2uEXdmjlruzw003';

  before(function* () {
    server = new Sdk.Server({
      keystore: {
        test: 'my-test-secret',
        'ngclient#2dcd': 'wqjx0iXcRw2uEXdmjlruzw003',
      },
      // level: 'DEBUG',
    });

    localServer = yield utils.startLocalServer((req, res) => {
      res.statusCode = 200;
      res.setHeader('x-mg-appkey', key);

      switch (req.url) {
        case '/mock/request': {
          const headers = {
            'user-agent': 'maga-client-nodejs-open/v1.0',
            'x-mg-agent': 'server',
            'x-mg-alg': 'AES-128',
            'x-mg-ts': '1493891574094',
            'x-mg-nonce': '94148431',
            'x-mg-appkey': 'ngclient#2dcd',
            'x-mg-sign': '999b46c12d4f7acc5fb6d07ea0375cb9',
            'x-mg-len': '192',
            'x-mg-code': 200,
          };

          Object.keys(headers).forEach(key => res.setHeader(key, headers[key]));
          res.end(Buffer.from('Exl51OfrqdPTTTrpGTIvOvnfXLmj0RxtnzQyzm2lGj39lv/KEpKSGiliO/q5MZo1FS8Ab8HYwYY/Wu6+XdXuq/19RwYGLW6QILEmD7N48ktgivV2KAupJEDnxS4 DcQ77XM4Ilo/4bp65hgRDoHwJSb+9qu+aEzCCWoQlxQYGpv1E8KxzQpIsS0UTZW1eZhASmb8To5+pm51Dze7N1gZSaXtbSamEATuaxiIaOYRQNnBWzWqjTRkOA67aFkAlgiwJ', 'base64'));
          break;
        }

        case '/mock/response': {
          const { meta, payload } = server.response({ result: { data: { from: 'server' }, state: { code: 200, msg: 'suc' } }, id: '123', key });
          Object.keys(meta).forEach(key => res.setHeader(key, meta[key]));
          res.end(payload);
          break;
        }

        case '/mock/response/keystore': {
          const { meta, payload } = server.response({
            result: { data: { from: 'server' },
              state: { code: 200, msg: 'suc' } },
            id: '123',
            key: req.headers['x-mg-appkey'],
          });
          Object.keys(meta).forEach(key => res.setHeader(key, meta[key]));
          res.end(payload);
          break;
        }

        case '/mock/response/empty': {
          const { meta, payload } = server.response({ result: { state: { code: 200, msg: 'suc' } }, id: '123', key });
          Object.keys(meta).forEach(key => res.setHeader(key, meta[ key ]));
          res.end(payload);
          break;
        }

        case '/mock/response/legacy': {
          const { meta, payload } = server.response({ result: { from: 'missing data and state' }, id: '123', key });
          Object.keys(meta).forEach(key => res.setHeader(key, meta[key]));
          res.end(payload);
          break;
        }

        case '/mock/response/permission': {
          try {
            server.decode({
              meta: {
                'x-mg-appkey': 'not-exist',
              },
              payload: 'a string',
            });
            res.statusCode = 500;
            res.end('should not run this');
          } catch (err) {
            const { meta, payload } = err.data;
            Object.keys(meta).forEach(key => res.setHeader(key, meta[ key ]));
            res.statusCode = err.code;
            res.end(JSON.stringify(payload));
          }
          break;
        }

        case '/mock/response/invalid': {
          res.end('abc');
          break;
        }

        case '/mock/response/invalid_request': {
          try {
            server.decode({
              meta: req.headers,
              payload: 'a string',
            });
            res.statusCode = 500;
            res.end('should not run this');
          } catch (err) {
            const { meta, payload } = err.data;
            Object.keys(meta).forEach(key => res.setHeader(key, meta[key]));
            res.statusCode = err.code;
            res.end(JSON.stringify(payload));
          }
          break;
        }

        case '/mock/response/timeout': {
          setTimeout(() => res.end('should timeout'), 1000);
          break;
        }

        case '/mock/response/500': {
          res.statusCode = 500;
          res.statusMessage = 'some error';
          res.end('abc');
          break;
        }

        default:
          res.statusCode = 500;
          break;
      }
    });

    client = new Sdk.Client({
      key,
      secret,
      host: localServer,
      simplify: true,
      // level: 'DEBUG',
    });
  });

  afterEach(mm.restore);

  it('should request', function* () {
    const result = yield client.request({ service: '/mock/request', data: {}, id: '1493891574094' });
    assert(result.id);
    assert(result.state.code === 2000000);
    assert(result.data.name === 'hello, rpc');
  });

  it('should request combo', function* () {
    const result = yield {
      api1: client.request({ service: '/mock/request', data: {}, id: '1493891574094' }),
      api2: client.request({ service: '/mock/response/empty', id: '123' }),
    };
    assert(result.api1.id);
    assert(result.api1.state.code === 2000000);
    assert(result.api1.data.name === 'hello, rpc');
    assert(result.api2.id === '123');
    assert(result.api2.state.msg === 'suc');
    assert(result.api2.state.code === 200);
  });

  it('should response', function* () {
    const result = yield client.request({ service: '/mock/response', id: '123' });
    const { id, state, data } = result;
    assert(id === '123');
    assert(state.msg === 'suc');
    assert(state.code === 200);
    assert(data.from === 'server');
  });

  it('should response with empty data', function* () {
    const result = yield client.request({ service: '/mock/response/empty', id: '123' });
    const { id, state, data } = result;
    assert(id === '123');
    assert(state.msg === 'suc');
    assert(state.code === 200);
    assert(Object.keys(data).length === 0);
  });

  it('should response with legacy support', function* () {
    const result = yield client.request({ service: '/mock/response/legacy', id: '123' });
    const { id, state, data } = result;
    assert(id === '123');
    assert(state.msg === 'warning: response missing { data, state }');
    assert(state.code === 200);
    assert(data.from === 'missing data and state');
  });

  it('should response with another client', function* () {
    const client2 = new Sdk.Client({ key: 'test', secret: 'my-test-secret', host: localServer, simplify: true });
    const result = yield client2.request({ service: '/mock/response/keystore', id: '123' });
    const { id, state, data, headers } = result;
    assert(id === '123');
    assert(state.msg === 'suc');
    assert(state.code === 200);
    assert(data.from === 'server');
    assert(headers[ 'x-mg-appkey' ] === 'test');
  });

  it('should response without simplify', function* () {
    const client2 = new Sdk.Client({ key: 'test', secret: 'my-test-secret', host: localServer });
    const response = yield client2.request({ service: '/mock/response/keystore', id: '123' });
    const { id, code, message, result, headers } = response;
    const { state, data } = result;
    assert(id === '123');
    assert(message === '业务执行成功');
    assert(code === 200);
    assert(state.msg === 'suc');
    assert(state.code === 200);
    assert(data.from === 'server');
    assert(headers['x-mg-appkey'] === 'test');
  });

  it('should decode at server', () => {
    const result = server.decode({
      meta: {
        'user-agent': 'maga-client-nodejs-open/v1.0',
        'x-mg-agent': 'server',
        'x-mg-alg': 'AES-128',
        'x-mg-ts': '1493970302764',
        'x-mg-nonce': '72208078',
        'x-mg-appkey': 'ngclient#2dcd',
        'x-mg-sign': '36746f0b6af0895da76a29ffac3070ce',
        'x-mg-len': '48',
      },
      payload: Buffer.from('v+JvwEqB+6LkeOFsCQjmvkeRkOjjWYuqhqulg0lHagRI9LbEYWwWQZgxJHy1tIzI', 'base64'),
    });
    assert(result.id === '1493970302763');
    assert(result.data);
  });

  it('should decode with invalid request id', function* () {
    try {
      server.decode({
        meta: {
          'user-agent': 'maga-client-nodejs-open/v1.0',
          'x-mg-agent': 'server',
          'x-mg-alg': 'AES-128',
          'x-mg-ts': '1493970088597',
          'x-mg-nonce': '93071486',
          'x-mg-appkey': 'ngclient#2dcd',
          'x-mg-sign': 'fc34927fe6dd35850977a4a487750e34',
          'x-mg-len': '16',
        },
        payload: Buffer.from('RVPW5VwBLHG3ckA01rKBKw==', 'base64'),
      });
      assert(false, 'should not run to this line');
    } catch (err) {
      assert(err.name === 'ProtocolDecodeError');
      assert(err.code === 400);
      assert(err.message.includes('decode error, id is required'));
    }
  });

  it('should response with invalid client', function* () {
    try {
      const client2 = new Sdk.Client({ key: 'no-exist', secret: 'no-exist', host: localServer });
      yield client2.request({ service: '/mock/response/permission' });
      assert(false, 'should not run to this line');
    } catch (err) {
      assert(err.name === 'HttpStatusError');
      assert(err.id);
      assert(err.code === 403);
      assert(err.message.includes('gateway error'));
      assert(err.message.includes('app key permission denied'));
      assert(err.data.message.includes('app key permission denied'));
    }
  });

  it('should response with invalid request data', function* () {
    try {
      yield client.request({ service: '/mock/response/invalid_request' });
      assert(false, 'should not run to this line');
    } catch (err) {
      assert(err.name === 'HttpStatusError');
      assert(err.id);
      assert(err.code === 400);
      assert(err.message.includes('gateway error'));
      assert(err.message.includes('decode error'));
      assert(err.data.message.includes('decode error'));
    }
  });

  it('should response with invalid response data', function* () {
    try {
      yield client.request({ service: '/mock/response/invalid' });
      assert(false, 'should not run to this line');
    } catch (err) {
      assert(err.name === 'ProtocolDecodeError');
      assert(err.id);
      assert(err.code === -3);
      assert(err.message.includes('decode error'));
    }
  });

  it('should support required=false when error', function* () {
    const err = yield client.request({ service: '/mock/response/invalid', options: { required: false } });
    assert(err.name === 'ProtocolDecodeError');
    assert(err.id);
    assert(err.code === -3);
    assert(err.message.includes('decode error'));
  });

  it('should response with http status error', function* () {
    try {
      yield client.request({ service: '/mock/response/500' });
      assert(false, 'should not run to this line');
    } catch (err) {
      assert(err.name === 'HttpStatusError');
      assert(err.id);
      assert(err.code === -3);
      assert(err.message.includes('gateway error'));
    }
  });

  it('should response with network error', function* () {
    try {
      yield client.request({ url: 'http://fake-tz/mock/response/invalid' });
      assert(false, 'should not run to this line');
    } catch (err) {
      assert(err.name === 'RequestError');
      assert(err.id);
      assert(err.code === -1);
      assert(err.message.includes('getaddrinfo ENOTFOUND'));
    }
  });

  it('should response with network timeout error', function* () {
    try {
      yield client.request({ service: '/mock/response/timeout', options: { timeout: 20 } });
      assert(false, 'should not run to this line');
    } catch (err) {
      assert(err.name === 'ResponseTimeoutError');
      assert(err.id);
      assert(err.code === -1);
      assert(err.message.includes('Response timeout'));
    }
  });
});

