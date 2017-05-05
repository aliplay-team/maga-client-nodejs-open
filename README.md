# @aligames/maga-open

阿里游戏 API 网关 - Node.js SDK

[![NPM version][npm-image]][npm-url]
[![build status][travis-image]][travis-url]
[![Test coverage][codecov-image]][codecov-url]
[![David deps][david-image]][david-url]
[![Known Vulnerabilities][snyk-image]][snyk-url]
[![NPM download][download-image]][download-url]

[npm-image]: https://img.shields.io/npm/v/@aligames/maga-open.svg?style=flat-square
[npm-url]: https://npmjs.org/package/@aligames/maga-open
[travis-image]: https://img.shields.io/travis/{{org}}/@aligames/maga-open.svg?style=flat-square
[travis-url]: https://travis-ci.org/{{org}}/@aligames/maga-open
[codecov-image]: https://codecov.io/gh/{{org}}/@aligames/maga-open/branch/master/graph/badge.svg
[codecov-url]: https://codecov.io/gh/{{org}}/@aligames/maga-open
[david-image]: https://img.shields.io/david/{{org}}/@aligames/maga-open.svg?style=flat-square
[david-url]: https://david-dm.org/{{org}}/@aligames/maga-open
[snyk-image]: https://snyk.io/test/npm/@aligames/maga-open/badge.svg?style=flat-square
[snyk-url]: https://snyk.io/test/npm/@aligames/maga-open
[download-image]: https://img.shields.io/npm/dm/@aligames/maga-open.svg?style=flat-square
[download-url]: https://npmjs.org/package/@aligames/maga-open

提供了 API 的请求封装、摘要签名、响应解释、消息监听等功能，使用 SDK 可以轻松完成 API 的调用，API 结果的获取。

## 安装依赖

仅支持 Node.js 6.x 以上版本。

```bash
npm i @aligames/maga-open --save
```

## 使用方法

### 作为消费者，发起请求

```js
const Sdk = require('@aligames/maga-open');
const client = new Sdk.Client({
  key: '<your_app_key>',
  secret: '<your_app_secret>',
  // host: 'http://',
  // level: 'INFO',
  // timeout: 5000, // 超时时间，默认为 5000ms
  // required: true, // 遇到错误时，直接抛错还是返回错误对象，便于组合请求，默认为 true - 抛错
  // prefix: 'MAGA',
  // logger: my_custom_logger,
});

const result = yield client.requst({
  // API 名称，必须用 / 开头
  service: '/api/xxx',
  // 请求的数据体
  data: {
    uid: 'tz',
  },
});

// 返回的对象中，包含 { id, data, state, headers }
console.log(result.data);
```

并发组合请求：

```js
const result = yield {
  api1: client.requst({ service: '/api/xxx', data: { uid: 'tz' } }),
  api2: client.requst({ service: '/api/yyy' }),
};

const data = {};
Object.keys(result).forEach(key => data[key] = result[key].data);

// 返回的对象中，包含 { api1: {}, api2: {} }
console.log(result.api1.data);

// 提取出所有 data
console.log(data);
```

### 作为服务提供方，提供接口服务

```js
const Sdk = require('@aligames/maga-open');
const server = new Sdk.Server({
  // 允许访问的 app key 和 secret 值对
  keystore: {},
  // level: 'INFO',
  // prefix: 'MAGA SERVER',
  // logger: my_custom_logger,
});

// 获取客户端发送的请求对象，需传递 headers 和 req body buffer，进行解码
const body = server.decode({ meta: ctx.headers, payload: rawBody });

// 进行业务逻辑处理，如查询数据库
const result = { uid: 'tz', from: 'server' };

// 对返回结果进行封包
const { meta, payload } = server.response({ id: id || Date.now(), code, msg, result });

// 返回 headers
ctx.set(meta);

// 返回请求体，buffer
ctx.body = payload;
```

### 调试

我们给开发者提供了 cli 命令，用于本地发起请求

```bash
$ maga-cli request <payload>
$ maga-cli encode <payload>
```

```bash
$ node ./node_modules/.bin/maga-cli --key=ngclient#2dcd --secret=wqjx0iXcRw2uEXdmjlruzw003 --host="http://localhost:7001" request'{"service":"/api/csbiz.account.findUserById?ver=1.0.0","data":{"uid":"tz"}}'
```