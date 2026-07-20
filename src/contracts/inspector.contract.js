'use strict';

/**
 * Contrato conceptual para los inspectores de metadatos.
 *
 * En JavaScript CommonJS no existen interfaces nativas,
 * por lo que usamos una clase base que obliga a implementar inspect().
 */
class InspectorContract {
  /**
   * Obtiene metadatos desde una fuente.
   *
   * @param {object} sourceOptions
   * @returns {Promise<object>}
   */
  async inspect(sourceOptions = {}) {
    void sourceOptions;

    throw new Error(
      `${this.constructor.name} debe implementar el método inspect()`
    );
  }
}

module.exports = InspectorContract;