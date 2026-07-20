'use strict';

/**
 * Contrato para motores de plantillas.
 */
class TemplateEngineContract {
  /**
   * Renderiza una plantilla.
   *
   * @param {string} template
   * @param {object} context
   * @returns {string}
   */
  render(template, context) {
    void template;
    void context;

    throw new Error(
      `${this.constructor.name} debe implementar render()`
    );
  }

  /**
   * Renderiza una plantilla almacenada en un archivo.
   *
   * @param {string} templatePath
   * @param {object} context
   * @returns {Promise<string>}
   */
  async renderFile(templatePath, context) {
    void templatePath;
    void context;

    throw new Error(
      `${this.constructor.name} debe implementar renderFile()`
    );
  }
}

module.exports = TemplateEngineContract;