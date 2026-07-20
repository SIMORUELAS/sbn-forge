'use strict';

/**
 * Contrato base para todos los generadores.
 */
class GeneratorContract {
  /**
   * Genera artefactos a partir del Generator Context.
   *
   * @param {object} context
   * @param {object} options
   * @returns {Promise<Array<object>>}
   */
  async generate(context, options = {}) {
    void context;
    void options;

    throw new Error(
      `${this.constructor.name} debe implementar generate()`
    );
  }
}

module.exports = GeneratorContract;