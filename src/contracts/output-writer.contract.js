'use strict';

/**
 * Contrato para escritura de archivos generados.
 */
class OutputWriterContract {
  /**
   * Escribe un archivo.
   *
   * @param {string} targetPath
   * @param {string} content
   * @param {object} options
   * @returns {Promise<object>}
   */
  async write(targetPath, content, options = {}) {
    void targetPath;
    void content;
    void options;

    throw new Error(
      `${this.constructor.name} debe implementar write()`
    );
  }
}

module.exports = OutputWriterContract;