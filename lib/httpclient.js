'use strict';

const Agent = require('agentkeepalive');
const HttpsAgent = require('agentkeepalive').HttpsAgent;
const urllib = require('urllib');

module.exports = config => {
  return new urllib.HttpClient2({
    agent: new Agent(config),
    httpsAgent: new HttpsAgent(config),
  });
};
