'use strict';
const chalk = require('chalk');
class Logger {
  constructor({ quiet = false } = {}) { this.quiet = quiet; }
  info(message) { if (!this.quiet) {console.log(chalk.cyan(message));} }
  warn(message) { if (!this.quiet) {console.warn(chalk.yellow(message));} }
  success(message) { if (!this.quiet) {console.log(chalk.green(message));} }
}
module.exports = { Logger };
