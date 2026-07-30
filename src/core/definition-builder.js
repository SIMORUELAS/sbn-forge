'use strict';

class DefinitionBuilder {
  build(metadata) {
    this.validateMetadata(metadata);

    const primaryKeyColumns = new Set(
      metadata.primaryKey?.columns || []
    );

    const foreignKeysByColumn = new Map(
      (metadata.foreignKeys || []).map(
        (foreignKey) => [
          foreignKey.column,
          foreignKey
        ]
      )
    );

    return {
      schema: metadata.schema,
      table: metadata.table,

      columns: metadata.columns.map((column) =>
        this.buildColumn(column, {
          primaryKeyColumns,
          foreignKeysByColumn
        })
      )
    };
  }

  buildColumn(
    column,
    {
      primaryKeyColumns,
      foreignKeysByColumn
    }
  ) {
    const isPrimaryKey =
      primaryKeyColumns.has(column.name);

    const isGenerated =
      column.identity === true;

    const hasDefault =
      column.defaultValue !== null &&
      column.defaultValue !== undefined;

    const foreignKeyMetadata =
      foreignKeysByColumn.get(column.name);

    const definition = {
      name: column.name,

      type:
        column.type ||
        column.dataType ||
        column.nativeType,

      nullable: column.nullable === true,

      primaryKey: isPrimaryKey,

      generated: isGenerated,

      writable:
        column.writable !== undefined
          ? column.writable === true
          : !isGenerated
    };

    if (foreignKeyMetadata) {
      definition.foreignKey = {
        schema:
          foreignKeyMetadata.referencedSchema,

        table:
          foreignKeyMetadata.referencedTable,

        column:
          foreignKeyMetadata.referencedColumn
      };
    }

    if (hasDefault) {
      definition.hasDefault = true;
      definition.default =
        column.defaultValue;
    }

    const length =
      column.length ??
      column.maxLength;

    if (Number.isInteger(length)) {
      definition.length = length;
    }

    if (
      Number.isInteger(column.precision)
    ) {
      definition.precision =
        column.precision;
    }

    if (
      Number.isInteger(column.scale)
    ) {
      definition.scale =
        column.scale;
    }

    return definition;
  }

  validateMetadata(metadata) {
    if (
      !metadata ||
      typeof metadata !== 'object'
    ) {
      throw new TypeError(
        'DefinitionBuilder requiere metadata'
      );
    }

    if (
      typeof metadata.schema !== 'string' ||
      metadata.schema.trim() === ''
    ) {
      throw new TypeError(
        'La metadata requiere schema'
      );
    }

    if (
      typeof metadata.table !== 'string' ||
      metadata.table.trim() === ''
    ) {
      throw new TypeError(
        'La metadata requiere table'
      );
    }

    if (!Array.isArray(metadata.columns)) {
      throw new TypeError(
        'La metadata requiere columns'
      );
    }
  }
}

module.exports = DefinitionBuilder;