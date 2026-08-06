'use strict';

class ScaffoldLogger {
  constructor(quiet = false) {
    this.quiet = quiet === true;
  }

  section(title) {
    if (this.quiet) {
      return;
    }

    console.log('');
    console.log('============================================================');
    console.log(title);
    console.log('============================================================');
  }

  line(message) {
    if (!this.quiet) {
      console.log(message);
    }
  }

  warning(message) {
    if (!this.quiet) {
      console.warn(`Advertencia: ${message}`);
    }
  }
}

module.exports = ScaffoldLogger;
