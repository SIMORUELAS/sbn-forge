'use strict';

const RuleContract = require('../contracts/rule.contract');

class VersioningRule extends RuleContract {
  get name() {
    return 'versioning';
  }

  matches(context) {
    return context.columns.some(
      (column) => column.name === 'version_no'
    );
  }

  apply(context) {
    return {
      ...context,
      capabilities: {
        ...context.capabilities,
        optimisticLock: true
      }
    };
  }
}

module.exports = VersioningRule;