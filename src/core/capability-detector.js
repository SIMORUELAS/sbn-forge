'use strict';

function hasColumn(
  definition,
  columnName
) {
  return definition.columns.some(
    column =>
      column.name === columnName
  );
}

function hasAllColumns(
  definition,
  columnNames
) {
  return columnNames.every(
    columnName =>
      hasColumn(
        definition,
        columnName
      )
  );
}

function detectCapabilities(
  definition,
  profile
) {
  if (
    !definition ||
    !Array.isArray(definition.columns)
  ) {
    const error = new Error(
      'La definición debe contener un arreglo de columnas.'
    );

    error.code =
      'INVALID_DEFINITION_COLUMNS';

    throw error;
  }

  if (
    !profile ||
    !profile.capabilities
  ) {
    const error = new Error(
      'El perfil debe contener capacidades.'
    );

    error.code =
      'INVALID_GENERATION_PROFILE';

    throw error;
  }

  const capabilities = {
    ...profile.capabilities
  };

  capabilities.softDelete =
    Boolean(
      capabilities.softDelete
    ) &&
    hasAllColumns(
      definition,
      [
        'deleted_at',
        'deleted_by'
      ]
    );

  capabilities.audit =
    Boolean(
      capabilities.audit
    ) &&
    hasAllColumns(
      definition,
      [
        'created_at',
        'created_by',
        'updated_at',
        'updated_by'
      ]
    );

  capabilities.optimisticLock =
    Boolean(
      capabilities.optimisticLock
    ) &&
    hasColumn(
      definition,
      'version_no'
    );

  capabilities.reorder =
    Boolean(
      capabilities.reorder
    ) &&
    hasColumn(
      definition,
      'execution_order'
    );

  return capabilities;
}

module.exports = {
  hasColumn,
  hasAllColumns,
  detectCapabilities
};