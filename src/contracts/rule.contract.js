'use strict';

/**
 * Contrato base para una regla del ADN SBN.
 */
class RuleContract {
  /**
   * Nombre único de la regla.
   *
   * @returns {string}
   */
  get name() {
    throw new Error(
      `${this.constructor.name} debe definir la propiedad name`
    );
  }

  /**
   * Determina si la regla aplica al contexto.
   *
   * @param {object} context
   * @returns {boolean}
   */
  matches(context) {
    void context;

    throw new Error(
      `${this.constructor.name} debe implementar matches()`
    );
  }

  /**
   * Aplica capacidades al contexto.
   *
   * @param {object} context
   * @returns {object}
   */
  apply(context) {
    void context;

    throw new Error(
      `${this.constructor.name} debe implementar apply()`
    );
  }
}

module.exports = RuleContract;