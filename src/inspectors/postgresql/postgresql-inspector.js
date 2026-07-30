'use strict';

const InspectorContract = require(
  '../../contracts/inspector.contract'
);

const PostgresReader = require('./postgres-reader');
const MetadataBuilder = require('./metadata-builder');

const VALID_IDENTIFIER_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_$]*$/;

class PostgreSqlInspector extends InspectorContract {
  /**
   * @param {object} datasource
   * @param {object} [dependencies]
   * @param {PostgresReader} [dependencies.reader]
   * @param {MetadataBuilder} [dependencies.metadataBuilder]
   */
  constructor(datasource, dependencies = {}) {
    super();

    if (!datasource) {
      throw new TypeError(
        'PostgreSqlInspector requiere un datasource'
      );
    }

    this.datasource = datasource;

    this.reader =
      dependencies.reader || new PostgresReader(datasource);

    this.metadataBuilder =
      dependencies.metadataBuilder || new MetadataBuilder();
  }

  async inspect(sourceOptions = {}) {
    const schemaName = sourceOptions.schema;
    const tableName = sourceOptions.table;

    this.validateIdentifier(schemaName, 'schema');
    this.validateIdentifier(tableName, 'table');

    const exists = await this.reader.tableExists(
      schemaName,
      tableName
    );

        if (!exists) {
        const error = new Error(
          `La tabla ${schemaName}.${tableName} no existe`
        );

        error.code = 'POSTGRESQL_TABLE_NOT_FOUND';

        throw error;
      }
      
    const [
      columns,
      primaryKey,
      foreignKeys,
      indexes
    ] = await Promise.all([
      this.reader.readColumns(schemaName, tableName),
      this.reader.readPrimaryKey(schemaName, tableName),
      this.reader.readForeignKeys(schemaName, tableName),
      this.reader.readIndexes(schemaName, tableName)
    ]);

    return this.metadataBuilder.build({
      schemaName,
      tableName,
      columns,
      primaryKey,
      foreignKeys,
      indexes
    });
  }

  validateIdentifier(value, propertyName) {
    if (
      typeof value !== 'string' ||
      !VALID_IDENTIFIER_PATTERN.test(value)
    ) {
      throw new TypeError(
        `${propertyName} contiene un identificador inválido`
      );
    }
  }
}

module.exports = PostgreSqlInspector;