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
    const sql = `
      SELECT
        tc.constraint_name,
        kcu.column_name,
        ccu.table_schema AS referenced_schema,
        ccu.table_name AS referenced_table,
        ccu.column_name AS referenced_column
      FROM information_schema.table_constraints tc
      INNER JOIN information_schema.key_column_usage kcu
        ON kcu.constraint_catalog = tc.constraint_catalog
       AND kcu.constraint_schema = tc.constraint_schema
       AND kcu.constraint_name = tc.constraint_name
      INNER JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_catalog = tc.constraint_catalog
       AND ccu.constraint_schema = tc.constraint_schema
       AND ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = $1
        AND tc.table_name = $2
      ORDER BY tc.constraint_name, kcu.ordinal_position;
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