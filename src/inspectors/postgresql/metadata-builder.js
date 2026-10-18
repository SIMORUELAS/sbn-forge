'use strict';

class MetadataBuilder {
  build({
    schemaName,
    tableName,
    columns = [],
    primaryKey = [],
    foreignKeys = [],
    indexes = []
  }) {
    return {
      source: {
        type: 'postgresql'
      },

      schema: schemaName,
      table: tableName,

      columns: columns.map((column) => ({
        position: Number(column.ordinal_position),
        name: column.column_name,
        dataType: column.data_type,
        nativeType: column.data_type === 'character varying' && (column.character_maximum_length !== null && column.character_maximum_length !== undefined)
          ? `character varying(${Number(column.character_maximum_length)})`
          : column.data_type === 'character' && (column.character_maximum_length !== null && column.character_maximum_length !== undefined)
            ? `character(${Number(column.character_maximum_length)})`
            : column.data_type === 'USER-DEFINED'
              ? column.udt_name
              : column.data_type,
        nullable: column.is_nullable === 'YES',
        defaultValue: column.column_default ?? null,
        maxLength:
          column.character_maximum_length === null
            ? null
            : Number(column.character_maximum_length),
        precision:
          column.numeric_precision === null
            ? null
            : Number(column.numeric_precision),
        scale:
          column.numeric_scale === null
            ? null
            : Number(column.numeric_scale),
        identity: column.is_identity === 'YES',
        identityGeneration: column.identity_generation ?? null
      })),

      primaryKey: {
        name: primaryKey[0]?.constraint_name ?? null,
        columns: primaryKey.map((item) => item.column_name)
      },

      foreignKeys: foreignKeys.map((foreignKey) => ({
        name: foreignKey.constraint_name,
        column: foreignKey.column_name,
        referencedSchema: foreignKey.referenced_schema,
        referencedTable: foreignKey.referenced_table,
        referencedColumn: foreignKey.referenced_column,
        onDelete: foreignKey.delete_rule,
        onUpdate: foreignKey.update_rule
      })),

      indexes: indexes.map((index) => ({
        name: index.index_name,
        definition: index.index_definition
      })),

      constraints: []
    };
  }
}

module.exports = MetadataBuilder;