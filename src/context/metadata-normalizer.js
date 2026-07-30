'use strict';

const SYSTEM_MANAGED_COLUMNS = new Set([
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

/**
 * Convierte diferentes fuentes de metadatos
 * en una estructura intermedia común.
 *
 * Esta clase no genera nombres de archivos
 * ni aplica reglas específicas de generación SBN.
 *
 * Solamente normaliza la información estructural.
 */
class MetadataNormalizer {
  normalize(input = {}) {
    if (
      !input ||
      typeof input !== 'object'
    ) {
      throw new TypeError(
        'Se requieren metadatos válidos'
      );
    }

    const schemaName =
      input.schema ||
      input.schemaName ||
      'public';

    const tableName =
      input.table ||
      input.tableName;

    if (
      typeof tableName !== 'string' ||
      tableName.trim() === ''
    ) {
      throw new TypeError(
        'Los metadatos deben incluir table'
      );
    }

    const columns =
      this.normalizeColumns(
        input.columns
      );

    const primaryKey =
      this.normalizePrimaryKey(
        input.primaryKey,
        columns
      );

    const foreignKeys =
      this.normalizeForeignKeys(
        input.foreignKeys,
        columns,
        schemaName
      );

    return {
      source:
        this.normalizeSource(
          input.source
        ),

      schema:
        schemaName.trim(),

      table:
        tableName.trim(),

      columns,

      primaryKey,

      foreignKeys,

      indexes:
        this.normalizeIndexes(
          input.indexes
        ),

      constraints:
        Array.isArray(
          input.constraints
        )
          ? input.constraints
          : [],

      metadata: {
        normalizedAt:
          new Date().toISOString()
      }
    };
  }

  normalizeSource(source) {
    if (
      typeof source === 'string'
    ) {
      return {
        type:
          source
      };
    }

    if (
      source &&
      typeof source === 'object'
    ) {
      return {
        type:
          source.type ||
          'unknown',

        ...source
      };
    }

    return {
      type:
        'json'
    };
  }

  normalizeColumns(columns) {
    if (
      !Array.isArray(columns) ||
      columns.length === 0
    ) {
      throw new TypeError(
        'Los metadatos deben incluir al menos una columna'
      );
    }

    return columns.map(
      (column, index) => {
        if (
          !column ||
          typeof column !== 'object'
        ) {
          throw new TypeError(
            `La columna en la posición ${index} no es válida`
          );
        }

        const rawName =
          column.name ||
          column.columnName;

        if (
          typeof rawName !== 'string' ||
          rawName.trim() === ''
        ) {
          throw new TypeError(
            `La columna en la posición ${index} no tiene nombre`
          );
        }

        const name =
          rawName.trim();

        const primaryKey =
          Boolean(
            column.primaryKey ||
            column.isPrimaryKey
          );

        const identity =
          Boolean(
            column.identity ||
            column.isIdentity ||
            column.autoIncrement
          );

        const generated =
          Boolean(
            column.generated ||
            column.isGenerated ||
            identity
          );

        const writable =
          column.writable !== false &&
          !primaryKey &&
          !generated &&
          !SYSTEM_MANAGED_COLUMNS.has(
            name
          );

        return {
          position:
            Number(
              column.position ??
              index + 1
            ),

          name,

          dataType:
            column.dataType ||
            column.type ||
            column.nativeType ||
            'unknown',

          nativeType:
            column.nativeType ||
            column.dataType ||
            column.type ||
            'unknown',

          nullable:
            Boolean(
              column.nullable
            ),

          defaultValue:
            column.defaultValue ??
            column.default ??
            null,

          maxLength:
            column.maxLength ===
            undefined
              ? null
              : column.maxLength,

          precision:
            column.precision ===
            undefined
              ? null
              : column.precision,

          scale:
            column.scale ===
            undefined
              ? null
              : column.scale,

          identity,

          identityGeneration:
            column.identityGeneration ??
            null,

          primaryKey,

          generated,

          writable,

          foreignKey:
            column.foreignKey ||
            null
        };
      }
    );
  }

  normalizePrimaryKey(
    primaryKey,
    columns = []
  ) {
    if (
      Array.isArray(primaryKey)
    ) {
      const normalizedColumns =
        primaryKey
          .filter(
            columnName =>
              typeof columnName ===
                'string' &&
              columnName.trim() !==
                ''
          )
          .map(
            columnName =>
              columnName.trim()
          );

      return {
        name:
          normalizedColumns.length === 1
            ? normalizedColumns[0]
            : null,

        columns:
          normalizedColumns
      };
    }

    if (
      primaryKey &&
      typeof primaryKey ===
        'object'
    ) {
      const normalizedColumns =
        Array.isArray(
          primaryKey.columns
        )
          ? primaryKey.columns
              .filter(
                columnName =>
                  typeof columnName ===
                    'string' &&
                  columnName.trim() !==
                    ''
              )
              .map(
                columnName =>
                  columnName.trim()
              )
          : [];

      return {
        name:
          primaryKey.name ??
          (
            normalizedColumns.length === 1
              ? normalizedColumns[0]
              : null
          ),

        columns:
          normalizedColumns
      };
    }

    const detectedColumns =
      columns
        .filter(
          column =>
            column.primaryKey ===
            true
        )
        .map(
          column =>
            column.name
        );

    return {
      name:
        detectedColumns.length === 1
          ? detectedColumns[0]
          : null,

      columns:
        detectedColumns
    };
  }

  normalizeForeignKeys(
    foreignKeys,
    columns = [],
    defaultSchema = 'public'
  ) {
    if (
      Array.isArray(foreignKeys) &&
      foreignKeys.length > 0
    ) {
      return foreignKeys.map(
        foreignKey =>
          this.normalizeForeignKey(
            foreignKey,
            defaultSchema
          )
      );
    }

    return columns
      .filter(
        column =>
          column.foreignKey &&
          typeof column.foreignKey ===
            'object'
      )
      .map(
        column => {
          const foreignKey =
            column.foreignKey;

          return {
            name:
              foreignKey.name ??
              null,

            column:
              column.name,

            referencedSchema:
              foreignKey.referencedSchema ||
              foreignKey.targetSchema ||
              foreignKey.schema ||
              defaultSchema,

            referencedTable:
              foreignKey.referencedTable ||
              foreignKey.targetTable ||
              foreignKey.table ||
              null,

            referencedColumn:
              foreignKey.referencedColumn ||
              foreignKey.targetColumn ||
              foreignKey.column ||
              'id'
          };
        }
      );
  }

  normalizeForeignKey(
    foreignKey,
    defaultSchema = 'public'
  ) {
    if (
      !foreignKey ||
      typeof foreignKey !==
        'object'
    ) {
      throw new TypeError(
        'La llave foránea no es válida'
      );
    }

    return {
      name:
        foreignKey.name ??
        null,

      column:
        foreignKey.column ||
        foreignKey.columnName ||
        null,

      referencedSchema:
        foreignKey.referencedSchema ||
        foreignKey.targetSchema ||
        foreignKey.schema ||
        defaultSchema,

      referencedTable:
        foreignKey.referencedTable ||
        foreignKey.targetTable ||
        foreignKey.table ||
        null,

      referencedColumn:
        foreignKey.referencedColumn ||
        foreignKey.targetColumn ||
        foreignKey.referenceColumn ||
        'id'
    };
  }

  normalizeIndexes(indexes) {
    if (
      !Array.isArray(indexes)
    ) {
      return [];
    }

    return indexes.map(
      index => ({
        name:
          index.name ??
          null,

        columns:
          Array.isArray(
            index.columns
          )
            ? index.columns
            : [],

        unique:
          Boolean(
            index.unique
          ),

        definition:
          index.definition ??
          null
      })
    );
  }
}

module.exports =
  MetadataNormalizer;