'use strict';

const {
  Client
} = require(
  'pg'
);

class PostgreSqlConfigTester {
  constructor(
    dependencies = {}
  ) {
    this.Client =
      dependencies.Client ||
      Client;
  }

  async test({
    host,
    port,
    database,
    user,
    password,
    schema
  } = {}) {
    const client =
      new this.Client({
        host,
        port,
        database,
        user,
        password
      });

    const result = {
      connected:
        false,

      databaseAccessible:
        false,

      schemaExists:
        false,

      informationSchemaAccessible:
        false
    };

    try {
      await client.connect();

      result.connected =
        true;

      const databaseResult =
        await client.query(
          'SELECT current_database() AS database'
        );

      result.databaseAccessible =
        databaseResult
          .rows[0]
          ?.database ===
        database;

      const schemaResult =
        await client.query(
          `
            SELECT EXISTS (
              SELECT 1
              FROM information_schema.schemata
              WHERE schema_name = $1
            ) AS exists
          `,
          [
            schema
          ]
        );

      result.schemaExists =
        schemaResult
          .rows[0]
          ?.exists ===
        true;

      await client.query(
        `
          SELECT table_schema, table_name
          FROM information_schema.tables
          LIMIT 1
        `
      );

      result.informationSchemaAccessible =
        true;

      return result;
    }
    finally {
      await client
        .end()
        .catch(
          () => {}
        );
    }
  }
}

module.exports =
  PostgreSqlConfigTester;