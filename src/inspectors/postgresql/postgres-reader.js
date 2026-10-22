'use strict';

class PostgresReader {
  /**
   * @param {object} datasource
   */
  constructor(datasource) {
    if (!datasource || typeof datasource.query !== 'function') {
      throw new TypeError(
        'PostgresReader requiere un datasource con query()'
      );
    }

    this.datasource = datasource;
  }

  async tableExists(schemaName, tableName) {
    const sql = `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = $1
          AND table_name = $2
      ) AS exists;
    `;

    const result = await this.datasource.query(sql, [
      schemaName,
      tableName
    ]);

    return result.rows?.[0]?.exists === true;
  }

  async readColumns(schemaName, tableName) {
    const sql = `
      SELECT
        c.ordinal_position,
        c.column_name,
        c.data_type,
        c.udt_name,
        c.is_nullable,
        c.column_default,
        c.character_maximum_length,
        c.numeric_precision,
        c.numeric_scale,
        c.datetime_precision,
        c.is_identity,
        c.identity_generation
      FROM information_schema.columns c
      WHERE c.table_schema = $1
        AND c.table_name = $2
      ORDER BY c.ordinal_position;
    `;

    const result = await this.datasource.query(sql, [
      schemaName,
      tableName
    ]);

    return result.rows;
  }

  async readPrimaryKey(schemaName, tableName) {
    const sql = `
      SELECT
        tc.constraint_name,
        kcu.column_name,
        kcu.ordinal_position
      FROM information_schema.table_constraints tc
      INNER JOIN information_schema.key_column_usage kcu
        ON kcu.constraint_catalog = tc.constraint_catalog
       AND kcu.constraint_schema = tc.constraint_schema
       AND kcu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'PRIMARY KEY'
        AND tc.table_schema = $1
        AND tc.table_name = $2
      ORDER BY kcu.ordinal_position;
    `;

    const result = await this.datasource.query(sql, [
      schemaName,
      tableName
    ]);

    return result.rows;
  }

  async readForeignKeys(schemaName, tableName) {
    // pg_constraint preserves the position-by-position mapping of composite FKs.
    // Joining constraint_column_usage directly duplicates/mismatches FK columns.
    const sql = `
      SELECT
        con.conname AS constraint_name,
        source_attribute.attname AS column_name,
        referenced_namespace.nspname AS referenced_schema,
        referenced_table.relname AS referenced_table,
        referenced_attribute.attname AS referenced_column,
        CASE con.confdeltype
          WHEN 'a' THEN 'NO ACTION'
          WHEN 'r' THEN 'RESTRICT'
          WHEN 'c' THEN 'CASCADE'
          WHEN 'n' THEN 'SET NULL'
          WHEN 'd' THEN 'SET DEFAULT'
        END AS delete_rule,
        CASE con.confupdtype
          WHEN 'a' THEN 'NO ACTION'
          WHEN 'r' THEN 'RESTRICT'
          WHEN 'c' THEN 'CASCADE'
          WHEN 'n' THEN 'SET NULL'
          WHEN 'd' THEN 'SET DEFAULT'
        END AS update_rule
      FROM pg_constraint con
      JOIN pg_class source_table ON source_table.oid = con.conrelid
      JOIN pg_namespace source_namespace ON source_namespace.oid = source_table.relnamespace
      JOIN pg_class referenced_table ON referenced_table.oid = con.confrelid
      JOIN pg_namespace referenced_namespace ON referenced_namespace.oid = referenced_table.relnamespace
      CROSS JOIN LATERAL unnest(con.conkey, con.confkey)
        WITH ORDINALITY AS key_columns(source_number, referenced_number, position)
      JOIN pg_attribute source_attribute
        ON source_attribute.attrelid = con.conrelid
       AND source_attribute.attnum = key_columns.source_number
      JOIN pg_attribute referenced_attribute
        ON referenced_attribute.attrelid = con.confrelid
       AND referenced_attribute.attnum = key_columns.referenced_number
      WHERE con.contype = 'f'
        AND source_namespace.nspname = $1
        AND source_table.relname = $2
      ORDER BY con.conname, key_columns.position;
    `;

    const result = await this.datasource.query(sql, [
      schemaName,
      tableName
    ]);

    return result.rows;
  }

  async readIndexes(schemaName, tableName) {
    const sql = `
      SELECT
        indexname AS index_name,
        indexdef AS index_definition
      FROM pg_indexes
      WHERE schemaname = $1
        AND tablename = $2
      ORDER BY indexname;
    `;

    const result = await this.datasource.query(sql, [
      schemaName,
      tableName
    ]);

    return result.rows;
  }
}

module.exports = PostgresReader;