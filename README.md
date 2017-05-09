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
[travis-image]: https://img.shields.io/travis/aliplay-team/maga-client-nodejs-open.svg?style=flat-square
[travis-url]: https://travis-ci.org/aliplay-team/maga-client-nodejs-open
[codecov-image]: https://codecov.io/gh/aliplay-team/maga-client-nodejs-open/branch/master/graph/badge.svg
[codecov-url]: https://codecov.io/gh/aliplay-team/maga-client-nodejs-open
[david-image]: https://img.shields.io/david/aliplay-team/maga-client-nodejs-open.svg?style=flat-square
[david-url]: https://david-dm.org/aliplay-team/maga-client-nodejs-open
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

我们的类库严格遵循 [Semver 版本规则](http://semver.org/lang/zh-CN/)，故强烈建议开发者通过 `^` 的方式引入，即:

```json
{
  "dependencies": {
    "@aligames/maga-open": "^1.0.0"
  }
}
```

## 使用方法

### 作为消费者，发起请求

- 通过 `new Sdk.Client({ key, secret })` 进行初始化，需要提供 `key`，`secret` 配置。
- 使用 `yield client.request({ service, data, options })` 来封包，发送请求给服务端，以及解析服务端返回数据。

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
  // logfile: 'path/to/log/file',
  // logger: my_custom_logger,
});

const result = yield client.request({
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
  api1: client.request({ service: '/api/xxx', data: { uid: 'tz' } }),
  api2: client.request({ service: '/api/yyy' }),
};

const data = {};
Object.keys(result).forEach(key => data[key] = result[key].data);

// 返回的对象中，包含 { api1: {}, api2: {} }
console.log(result.api1.data);

// 提取出所有 data
console.log(data);
```

错误处理：

```js
try {
  const result = yield client.request({
    service: '/api/xxx',
    data: {
      uid: 'tz',
    },
  });
} catch (err) {
  // { message, code, data }
  console.error(err);
}
```

对特定请求配置：

```js
const config = {
  // API 名称，必须用 / 开头
  service: '/api/xxx',
  // 请求的数据体
  data: {
    uid: 'tz',
  },
};

const result = yield client.request(config, {
  timeout: 100000,
  required: false,
});

// api1 是关键请求，失败了则整个失败，而 api2 请失败时，不会报错，此时 result.api2 是 error 对象
const combo = yield {
  api1: client.request({ service: '/api/xxx', data: { uid: 'tz' } }),
  api2: client.request({ service: '/api/yyy' }, { required: false }),
};
```

### 作为服务提供方，提供接口服务

- 通过 `new Sdk.Server({ keystore })` 进行初始化，需要提供 `keystore` 配置。
- 使用 `server.decode({ meta, payload })` 解析客户端传递过来的请求体，解析出错会抛错，请注意 `try catch` 处理。
- 使用 `server.response({ result, id, code, msg })` 对响应数据进行封包，返回 `{ meta, payload }` 供开发者使用，前者用于配置 headers，后者是 buffer 直接返回给对端。
  - `code` 是 API 层的状态码，如 `API 找不到，返回 404`，`没有权限，keystore 校验失败，返回 403`，等等。
  - `result` 节点为业务结果，数据一般为 `{ data: {}, state: { code, message }}`
  - 注意： result.state.code 和上面提到的 state 不一样，是业务的状态码


```js
const Sdk = require('@aligames/maga-open');
const server = new Sdk.Server({
  // 允许访问的 app key 和 secret 值对
  keystore: {
    '<your_app_key>': '<your_app_secret>',
  },
  // level: 'INFO',
  // prefix: 'MAGA SERVER',
  // logfile: 'path/to/log/file',
  // logger: my_custom_logger,
});


try {
  // 获取客户端发送的请求对象，需传递 headers 和 req body buffer，进行解码，解析出错会抛错，请注意 `try catch` 处理。
  const body = server.decode({ meta: ctx.headers, payload: rawBody });

  // 进行业务逻辑处理，如查询数据库
  const result = yield ctx.service.user.find({ uid: body.uid, from: 'server' });

  // 对返回结果进行封包
  const { meta, payload } = server.response({ id: id || Date.now(), code, msg, result });

  // 返回 headers
  ctx.set(meta);

  // 返回请求体，buffer
  ctx.body = payload;

} catch (err) {
  // 需要自己处理报错后的返回
  ctx.status = err.code;
  ctx.body = err;
}
```

### 调试

我们给开发者提供了 cli 命令，用于本地发起请求。

```bash
$ maga-cli request --key=<key> --secret=<secret> <payload json string>
$ maga-cli encode --key=<key> --secret=<secret>  <payload json string>
$ maga-cli decode --key=<key> --secret=<secret>  <payload base64 string>
```

示例：

```bash
$ node ./node_modules/.bin/maga-cli --key=ngclient#2dcd --secret=wqjx0iXcRw2uEXdmjlruzw003 --host="http://localhost:7001" request '{"service":"/api/csbiz.account.findUserById?ver=1.0.0","data":{"uid":"tz"}}'

$ node bin/maga-cli.js --key=ngclient#2dcd --secret=wqjx0iXcRw2uEXdmjlruzw003 --host="http://100.84.254.233:7001" decode 'Rn+Cek0ATDXYJvkDxgiJ20+wRP4XdvFKcp4XXePyj+R83W9H+yct6LEIzrlP9cw6tohaF1a1AhcXnayIv+TfY18Kr7uJ8v9mdDBx1Efc3BUtDS3LJzW3BBhXBYeQ5C0B'
```

### 质量

我们的类库严格遵循 [Semver 版本规则](http://semver.org/lang/zh-CN/)，故强烈建议开发者通过 `^` 的方式引入，即:

```json
{
  "dependencies": {
    "@aligames/maga-open": "^1.0.0"
  }
}
```

单元测试覆盖率：

```bash
=============================== Coverage summary ===============================
Statements   : 100% ( 190/190 )
Branches     : 100% ( 80/80 )
Functions    : 100% ( 19/19 )
Lines        : 100% ( 188/188 )
================================================================================
```

### 服务端开发

参见示例： https://github.com/aliplay-team/maga-client-nodejs-open-example

推荐使用我们开源的『企业级的 Node.js Web 基础框架』 - eggjs
- 官方地址：https://eggjs.org/
- 介绍：https://zhuanlan.zhihu.com/p/25860846

## 反馈

- 联系接口同学
- 或提交 [Issue](https://github.com/aliplay-team/maga-client-nodejs-open/issues)
