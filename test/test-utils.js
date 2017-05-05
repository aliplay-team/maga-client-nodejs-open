'use strict';

const http = require('http');

let localServer;
let handler;

exports.startLocalServer = fn => {
  return new Promise((resolve, reject) => {
    handler = fn || handler || function(req, res) {
      res.statusCode = 200;
      res.end(`${req.method} ${req.url}`);
    };
    if (localServer) {
      return resolve('http://127.0.0.1:' + localServer.address().port);
    }
    localServer = http.createServer((req, res) => {
      req.resume();
      req.on('end', () => {
        handler(req, res);
      });
    });

    localServer.listen(0, err => {
      if (err) return reject(err);
      return resolve('http://127.0.0.1:' + localServer.address().port);
    });
  });
};
process.once('exit', () => localServer && localServer.close());
