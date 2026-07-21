'use strict';

const AUDIT_COLUMNS = new Set([
  'created_at',
  'created_by',
  'created_from',
  'updated_at',
  'updated_by',
  'updated_from',
  'deleted_at',
  'deleted_by'
]);

class CapabilityDetector {
  detect(normalizedMetadata) {
    if (
      !normalizedMetadata ||
      !Array.isArray(normalizedMetadata.columns)
    ) {
      throw new TypeError(
        'Se requieren metadatos normalizados'
      );
    }

    const columnNames = new Set(
      normalizedMetadata.columns.map(
        (column) => column.name
      )
    );

    const auditColumns = [...AUDIT_COLUMNS].filter(
      (columnName) => columnNames.has(columnName)
    );

    return {
      crud: true,

      audit: auditColumns.length > 0,

      auditColumns,

      softDelete: columnNames.has('deleted_at'),

      optimisticLock: columnNames.has('version_no'),

      multiTenant: columnNames.has('organization_id'),

      branchSecurity: columnNames.has('branch_id'),

      statusManagement: columnNames.has('status'),

      jsonColumns: normalizedMetadata.columns
        .filter((column) =>
          ['json', 'jsonb'].includes(
            String(column.nativeType).toLowerCase()
          )
        )
        .map((column) => column.name),

      foreignKeys:
        normalizedMetadata.foreignKeys.length > 0,

      hasPrimaryKey:
        normalizedMetadata.primaryKey.columns.length > 0
    };
  }
}

module.exports = CapabilityDetector;