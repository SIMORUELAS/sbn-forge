'use strict';

class FeatureDetector {
  detect(context) {
    if (!context || typeof context !== 'object') {
      throw new TypeError(
        'FeatureDetector requiere un Generator Context válido'
      );
    }

    if (!Array.isArray(context.columns)) {
      throw new TypeError(
        'Generator Context debe incluir columns'
      );
    }

    const columnNames = new Set(
      context.columns.map((column) =>
        String(column.name).toLowerCase()
      )
    );

    const primaryKeyColumns =
      context.primaryKey?.columns || [];

    return {
      hasPrimaryKey: primaryKeyColumns.length > 0,

      compositePrimaryKey:
        primaryKeyColumns.length > 1,

      identityPrimaryKey:
        this.hasIdentityPrimaryKey(
          context.columns,
          primaryKeyColumns
        ),

      audit:
        columnNames.has('created_at') ||
        columnNames.has('updated_at') ||
        columnNames.has('created_by') ||
        columnNames.has('updated_by'),

      fullAudit:
        columnNames.has('created_at') &&
        columnNames.has('created_by') &&
        columnNames.has('updated_at') &&
        columnNames.has('updated_by'),

      softDelete: columnNames.has('deleted_at'),

      softDeleteUser: columnNames.has('deleted_by'),

      optimisticLock:
        columnNames.has('version_no') ||
        columnNames.has('row_version'),

      multiTenant:
        columnNames.has('organization_id') ||
        columnNames.has('tenant_id'),

      branchSecurity: columnNames.has('branch_id'),

      statusManagement:
        columnNames.has('status') ||
        columnNames.has('status_id'),

      activeFlag:
        columnNames.has('is_active') ||
        columnNames.has('active'),

      sortable:
        columnNames.has('sort_order') ||
        columnNames.has('display_order'),

      hierarchical:
        columnNames.has('parent_id'),

      effectiveDates:
        columnNames.has('valid_from') ||
        columnNames.has('valid_to') ||
        columnNames.has('effective_from') ||
        columnNames.has('effective_to'),

      jsonColumns: context.columns
        .filter((column) =>
          ['json', 'jsonb'].includes(
            String(
              column.nativeType || column.dataType
            ).toLowerCase()
          )
        )
        .map((column) => column.name),

      dateColumns: context.columns
        .filter((column) =>
          this.isDateType(
            column.nativeType || column.dataType
          )
        )
        .map((column) => column.name),

      foreignKeyCount:
        Array.isArray(context.foreignKeys)
          ? context.foreignKeys.length
          : 0,

      indexCount:
        Array.isArray(context.indexes)
          ? context.indexes.length
          : 0
    };
  }

  hasIdentityPrimaryKey(columns, primaryKeyColumns) {
    return columns.some(
      (column) =>
        primaryKeyColumns.includes(column.name) &&
        column.identity === true
    );
  }

  isDateType(type) {
    const normalizedType = String(type).toLowerCase();

    return [
      'date',
      'timestamp',
      'timestamp without time zone',
      'timestamp with time zone',
      'timestamptz',
      'datetime',
      'datetime2'
    ].includes(normalizedType);
  }
}

module.exports = FeatureDetector;