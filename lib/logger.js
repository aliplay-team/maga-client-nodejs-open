'use strict';

const Logger = require('egg-logger').Logger;
const ConsoleTransport = require('egg-logger').ConsoleTransport;
const chalk = require('chalk');

class MagaLogger extends Logger {
  /* istanbul ignore next */
  constructor(options = {}) {
    super(options);
    const consoleTransport = new ConsoleTransport({
      level: options.consoleLevel || options.level || 'INFO',
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
    });
    this.set('console', consoleTransport);
  }

  get defaults() {
    return {
      level: 'INFO',
      prefix: '',
    };
  }
}

module.exports = MagaLogger;
