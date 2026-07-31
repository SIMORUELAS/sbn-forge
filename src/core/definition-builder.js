'use strict';

class DefinitionBuilder {
  build(metadata) {
    this.validateMetadata(metadata);

    const primaryKeyColumns =
      new Set(
        metadata.primaryKey?.columns ||
        []
      );

    const foreignKeysByColumn =
      new Map(
        (metadata.foreignKeys || [])
          .map(
            foreignKey => [
              foreignKey.column,
              foreignKey
            ]
          )
      );

    return {
      schema:
        metadata.schema,

      table:
        metadata.table,

      columns:
        metadata.columns.map(
          column =>
            this.buildColumn(
              column,
              {
                primaryKeyColumns,
                foreignKeysByColumn
              }
            )
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
      primaryKeyColumns.has(
        column.name
      );

    /*
     * Una columna identity sí es generada
     * por PostgreSQL.
     *
     * Una columna UUID con:
     *
     * DEFAULT gen_random_uuid()
     *
     * tiene un valor predeterminado, pero no
     * es técnicamente una columna identity.
     */
    const isGenerated =
      column.identity === true;

    const hasDefault =
      column.defaultValue !== null &&
      column.defaultValue !== undefined;

    const foreignKeyMetadata =
      foreignKeysByColumn.get(
        column.name
      );

    /*
     * Reglas para una columna escribible:
     *
     * 1. La metadata no debe marcarla
     *    explícitamente como no escribible.
     *
     * 2. No debe ser primary key.
     *
     * 3. No debe ser generada.
     *
     * La primary key siempre tiene prioridad
     * sobre column.writable.
     */
    const isWritable =
      column.writable !== false &&
      !isPrimaryKey &&
      !isGenerated;

    const definition = {
      name:
        column.name,

      type:
        column.type ||
        column.dataType ||
        column.nativeType,

      nullable:
        column.nullable === true,

      primaryKey:
        isPrimaryKey,

      generated:
        isGenerated,

      writable:
        isWritable
    };

    if (foreignKeyMetadata) {
      definition.foreignKey = {
        schema:
          foreignKeyMetadata
            .referencedSchema,

        table:
          foreignKeyMetadata
            .referencedTable,

        column:
          foreignKeyMetadata
            .referencedColumn
      };
    }

    if (hasDefault) {
      definition.hasDefault =
        true;

      definition.default =
        column.defaultValue;
    }

    const length =
      column.length ??
      column.maxLength;

    if (
      Number.isInteger(
        length
      )
    ) {
      definition.length =
        length;
    }

    if (
      Number.isInteger(
        column.precision
      )
    ) {
      definition.precision =
        column.precision;
    }

    if (
      Number.isInteger(
        column.scale
      )
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
      typeof metadata.schema !==
        'string' ||
      metadata.schema.trim() ===
        ''
    ) {
      throw new TypeError(
        'La metadata requiere schema'
      );
    }

    if (
      typeof metadata.table !==
        'string' ||
      metadata.table.trim() ===
        ''
    ) {
      throw new TypeError(
        'La metadata requiere table'
      );
    }

    if (
      !Array.isArray(
        metadata.columns
      )
    ) {
      throw new TypeError(
        'La metadata requiere columns'
      );
    }
  }
}

module.exports =
  DefinitionBuilder;