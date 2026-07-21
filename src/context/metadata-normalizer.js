'use strict';

/**
 * Convierte diferentes fuentes de metadatos en una estructura intermedia común.
 *
 * Esta clase no genera nombres de archivos ni aplica reglas SBN.
 * Solamente normaliza la información estructural.
 */
class MetadataNormalizer {
  normalize(input = {}) {
    if (!input || typeof input !== 'object') {
      throw new TypeError('Se requieren metadatos válidos');
    }

    const schemaName = input.schema || input.schemaName || 'public';
    const tableName = input.table || input.tableName;

    if (typeof tableName !== 'string' || tableName.trim() === '') {
      throw new TypeError('Los metadatos deben incluir table');
    }

    return {
      source: this.normalizeSource(input.source),

      schema: schemaName,
      table: tableName,

      columns: this.normalizeColumns(input.columns),

      primaryKey: this.normalizePrimaryKey(input.primaryKey),

      foreignKeys: this.normalizeForeignKeys(input.foreignKeys),

      indexes: this.normalizeIndexes(input.indexes),

      constraints: Array.isArray(input.constraints)
        ? input.constraints
        : [],

      metadata: {
        normalizedAt: new Date().toISOString()
      }
    };
  }

  normalizeSource(source) {
    if (typeof source === 'string') {
      return {
        type: source
      };
    }

    if (source && typeof source === 'object') {
      return {
        type: source.type || 'unknown',
        ...source
      };
    }

    return {
      type: 'json'
    };
  }

  normalizeColumns(columns) {
    if (!Array.isArray(columns) || columns.length === 0) {
      throw new TypeError(
        'Los metadatos deben incluir al menos una columna'
      );
    }

    return columns.map((column, index) => {
      const name = column.name || column.columnName;

      if (typeof name !== 'string' || name.trim() === '') {
        throw new TypeError(
          `La columna en la posición ${index} no tiene nombre`
        );
      }

      return {
        position: Number(column.position ?? index + 1),
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
        nullable: Boolean(column.nullable),
        defaultValue:
          column.defaultValue ??
          column.default ??
          null,
        maxLength:
          column.maxLength === undefined
            ? null
            : column.maxLength,
        precision:
          column.precision === undefined
            ? null
            : column.precision,
        scale:
          column.scale === undefined
            ? null
            : column.scale,
        identity: Boolean(
          column.identity ||
          column.isIdentity ||
          column.autoIncrement
        ),
        identityGeneration:
          column.identityGeneration ?? null
      };
    });
  }

  normalizePrimaryKey(primaryKey) {
    if (Array.isArray(primaryKey)) {
      return {
        name: null,
        columns: primaryKey
      };
    }

    if (primaryKey && typeof primaryKey === 'object') {
      return {
        name: primaryKey.name ?? null,
        columns: Array.isArray(primaryKey.columns)
          ? primaryKey.columns
          : []
      };
    }

    return {
      name: null,
      columns: []
    };
  }

  normalizeForeignKeys(foreignKeys) {
    if (!Array.isArray(foreignKeys)) {
      return [];
    }

    return foreignKeys.map((foreignKey) => ({
      name: foreignKey.name ?? null,
      column:
        foreignKey.column ||
        foreignKey.columnName,
      referencedSchema:
        foreignKey.referencedSchema ||
        foreignKey.targetSchema ||
        'public',
      referencedTable:
        foreignKey.referencedTable ||
        foreignKey.targetTable,
      referencedColumn:
        foreignKey.referencedColumn ||
        foreignKey.targetColumn ||
        'id'
    }));
  }

  normalizeIndexes(indexes) {
    if (!Array.isArray(indexes)) {
      return [];
    }

    return indexes.map((index) => ({
      name: index.name ?? null,
      columns: Array.isArray(index.columns)
        ? index.columns
        : [],
      unique: Boolean(index.unique),
      definition: index.definition ?? null
    }));
  }
}

module.exports = MetadataNormalizer;
