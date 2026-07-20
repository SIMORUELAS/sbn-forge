'use strict';

const RuleContract = require('../contracts/rule.contract');

const AUDIT_COLUMNS = [
  'created_at',
  'created_by',
  'created_from',
  'updated_at',
  'updated_by',
  'updated_from',
  'deleted_at',
  'deleted_by'
];

class AuditRule extends RuleContract {
  get name() {
    return 'audit';
  }

  matches(context) {
    const columnNames = new Set(
      context.columns.map((column) => column.name)
    );

    return AUDIT_COLUMNS.some((columnName) =>
      columnNames.has(columnName)
    );
  }

  apply(context) {
    return {
      ...context,
      capabilities: {
        ...context.capabilities,
        audit: true
      }
    };
  }
}

module.exports = AuditRule;