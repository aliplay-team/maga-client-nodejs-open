'use strict';

const Logger = require('egg-logger').Logger;
const ConsoleTransport = require('egg-logger').ConsoleTransport;
const FileTransport = require('egg-logger').FileTransport;
const chalk = require('chalk');

class MagaLogger extends Logger {
  constructor(options) {
    /* istanbul ignore next */
    options = options || {};
    options.level = options.level || 'INFO';
    super(options);

    this.set('console', new ConsoleTransport({
      level: options.consoleLevel || options.level,
      eol: options.eol,
      formatter(meta) {
        let msg = `[${meta.level}] ${meta.message}`;

        /* istanbul ignore else */
        if (options.prefix) {
          msg = `[${options.prefix}]${msg}`;
        }

        /* istanbul ignore if */
        if (!chalk.supportsColor) {
          return msg;
        }

        /* istanbul ignore next */
        if (meta.level === 'ERROR') {
          return chalk.red(msg);
        } else if (meta.level === 'WARN') {
          return chalk.yellow(msg);
        } else if (meta.level === 'DEBUG') {
          return chalk.gray(msg);
        }

        msg = msg.replace(/(\[[\w\-_.:]+\])/g, chalk.blue('$1'));
        return msg;
      },
    }));

    if (options.logfile) {
      console.log(options.level)
      this.set('file', new FileTransport({
        file: options.logfile,
        level: options.level,
      }));
    }
  }

  get defaults() {
    return {
      level: 'INFO',
      prefix: '',
    };
  }
}

module.exports = MagaLogger;
