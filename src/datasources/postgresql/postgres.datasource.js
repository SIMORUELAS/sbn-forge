'use strict';

const { Pool } = require('pg');
const DatasourceContract = require('../../contracts/datasource.contract');

class PostgresDatasource extends DatasourceContract {
  /**
   * @param {object} config
   * @param {string} [config.connectionString]
   * @param {string} [config.host]
   * @param {number} [config.port]
   * @param {string} [config.database]
   * @param {string} [config.user]
   * @param {string} [config.password]
   * @param {boolean|object} [config.ssl]
   * @param {object} [dependencies]
   * @param {object} [dependencies.pool]
   */
  constructor(config = {}, dependencies = {}) {
    super();

    this.pool = dependencies.pool || new Pool(config);
  }

  async query(statement, parameters = []) {
    if (typeof statement !== 'string' || statement.trim() === '') {
      throw new TypeError('statement debe ser una consulta SQL válida');
    }

    if (!Array.isArray(parameters)) {
      throw new TypeError('parameters debe ser un arreglo');
    }

    return this.pool.query(statement, parameters);
  }

  async healthCheck() {
    const result = await this.query('SELECT 1 AS status');

    return result.rows?.[0]?.status === 1;
  }

  async close() {
    if (this.pool && typeof this.pool.end === 'function') {
      await this.pool.end();
    }
  }
}

module.exports = PostgresDatasource;