'use strict';

const RuleContract = require('../contracts/rule.contract');

class SoftDeleteRule extends RuleContract {
  get name() {
    return 'soft-delete';
  }

  matches(context) {
    return context.columns.some(
      (column) => column.name === 'deleted_at'
    );
  }

  apply(context) {
    return {
      ...context,
      capabilities: {
        ...context.capabilities,
        softDelete: true
      }
    };
  }
}

module.exports = SoftDeleteRule;