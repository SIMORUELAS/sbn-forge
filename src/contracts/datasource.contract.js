'use strict';

/**
 * Puerto de acceso a una fuente de datos.
 *
 * Las implementaciones pueden usar PostgreSQL, SQL Server,
 * Firebird, MySQL u otra tecnología.
 */
class DatasourceContract {
  /**
   * Ejecuta una operación de consulta.
   *
   * @param {string} statement
   * @param {Array<unknown>} parameters
   * @returns {Promise<object>}
   */
  async query(statement, parameters = []) {
    void statement;
    void parameters;

    throw new Error(
      `${this.constructor.name} debe implementar query()`
    );
  }

  /**
   * Verifica que la fuente de datos esté disponible.
   *
   * @returns {Promise<boolean>}
   */
  async healthCheck() {
    throw new Error(
      `${this.constructor.name} debe implementar healthCheck()`
    );
  }

  /**
   * Libera conexiones y recursos.
   *
   * @returns {Promise<void>}
   */
  async close() {
    throw new Error(
      `${this.constructor.name} debe implementar close()`
    );
  }
}

module.exports = DatasourceContract;