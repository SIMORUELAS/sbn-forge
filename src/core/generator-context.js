'use strict';

const crypto = require('crypto');

const {
  buildJsonSchemaProperty
} = require('./json-schema-mapper');

const {
  validateDefinition
} = require('./definition-validator');

const {
  buildNames
} = require('./naming');

const SYSTEM_COLUMNS = Object.freeze([
  'created_at',
  'created_by',
  'created_from',
  'updated_at',
  'updated_by',
  'updated_from',
  'deleted_at',
  'deleted_by',
  'version_no'
]);

function normalizeType(type) {
  const normalizedType = String(type || '')
    .trim()
    .toLowerCase();

  if (normalizedType === 'character varying') {
    return 'varchar';
  }

  if (normalizedType === 'timestamp without time zone') {
    return 'timestamp';
  }

  if (normalizedType === 'timestamp with time zone') {
    return 'timestamptz';
  }

  return normalizedType;
}

function jsType(type) {
  const normalizedType = normalizeType(type);

  if (
    [
      'bigint',
      'integer',
      'smallint',
      'numeric',
      'decimal',
      'real',
      'double precision'
    ].includes(normalizedType)
  ) {
    return 'number';
  }

  if (normalizedType === 'boolean') {
    return 'boolean';
  }

  if (['json', 'jsonb'].includes(normalizedType)) {
    return 'object';
  }

  return 'string';
}

function buildPermissions(names, definition) {
  if (
    Array.isArray(definition.permissions) &&
    definition.permissions.length > 0
  ) {
    return [...definition.permissions];
  }

  return [
    `${names.permissionPrefix}_VIEW`,
    `${names.permissionPrefix}_CREATE`,
    `${names.permissionPrefix}_UPDATE`,
    `${names.permissionPrefix}_DELETE`
  ];
}

function createGeneratorContext(
  definition,
  {
    generatorVersion = '0.1.0',
    generatedAt = new Date().toISOString()
  } = {}
) {
  validateDefinition(definition);

  const names = buildNames(definition.table);

  const columns = definition.columns.map((column, index) => {
    const normalizedType = normalizeType(column.type);

    const primaryKey = column.primaryKey === true;
    const generated = column.generated === true;

    return {
      ...column,

      index,

      type: normalizedType,

      jsType: jsType(normalizedType),

      jsonSchema: buildJsonSchemaProperty({
       ...column,
       type: normalizedType
      }),

      nullable: column.nullable === true,

      primaryKey,

      generated,

      hasDefault: column.default !== undefined,

      writable:
        column.writable !== false &&
        !primaryKey &&
        !generated &&
        !SYSTEM_COLUMNS.includes(column.name),

      foreignKey: column.foreignKey || null
    };
  });

  const columnMap = Object.fromEntries(
    columns.map(column => [
      column.name,
      column
    ])
  );

  const primaryKeys = columns.filter(
    column => column.primaryKey
  );

  if (primaryKeys.length === 0) {
    throw new Error(
      `La tabla ${definition.schema}.${definition.table} debe tener una llave primaria.`
    );
  }

  const primaryKey = primaryKeys[0];

  const writableColumns = columns.filter(
    column => column.writable
  );

  const foreignKeys = columns.filter(
    column => column.foreignKey
  );

  const capabilities = {
    softDelete: Boolean(columnMap.deleted_at),

    audit: [
      'created_at',
      'created_by',
      'created_from',
      'updated_at',
      'updated_by',
      'updated_from'
    ].some(columnName => Boolean(columnMap[columnName])),

    versioning: Boolean(columnMap.version_no),

    optimisticLock: Boolean(columnMap.version_no),

    organizationScope: Boolean(
      columnMap.organization_id
    ),

    branchScope: Boolean(
      columnMap.branch_id
    ),

    json: columns.some(column =>
      ['json', 'jsonb'].includes(column.type)
    ),

    foreignKeys: foreignKeys.length > 0,

    pagination: true,

    filtering: true,

    sorting: true
  };

  const permissions = buildPermissions(
    names,
    definition
  );

  const definitionHash = crypto
    .createHash('sha256')
    .update(JSON.stringify(definition))
    .digest('hex');

  return {
    generator: {
      name: 'SBN Forge',
      version: generatorVersion,
      generatedAt
    },

    source: {
      type: 'json',
      definitionHash
    },

    schema: definition.schema,

    table: definition.table,

    description: definition.description || '',

    names,

    columns,

    columnMap,

    primaryKeys,

    primaryKey,

    writableColumns,

    foreignKeys,

    capabilities,

    permissions,

    options: definition.options || {}
  };
}

module.exports = {
  createGeneratorContext,
  normalizeType,
  jsType,
  buildPermissions
};