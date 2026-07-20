'use strict';

class RuleEngine {
  /**
   * @param {Array<object>} rules
   */
  constructor(rules = []) {
    if (!Array.isArray(rules)) {
      throw new TypeError('rules debe ser un arreglo');
    }

    this.rules = rules;
  }

  /**
   * Aplica todas las reglas compatibles con el contexto.
   *
   * @param {object} context
   * @returns {object}
   */
  apply(context) {
    if (!context || typeof context !== 'object') {
      throw new TypeError('Se requiere un Generator Context válido');
    }

    return this.rules.reduce((currentContext, rule) => {
      if (!rule || typeof rule.matches !== 'function') {
        throw new TypeError('La regla no implementa matches()');
      }

      if (typeof rule.apply !== 'function') {
        throw new TypeError('La regla no implementa apply()');
      }

      if (!rule.matches(currentContext)) {
        return currentContext;
      }

      return rule.apply(currentContext);
    }, context);
  }
}

module.exports = RuleEngine;