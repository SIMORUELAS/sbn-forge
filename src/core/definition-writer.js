'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');

class DefinitionWriter {
  /**
   * Guarda una definición Forge en formato JSON.
   *
   * @param {object} definition
   * @param {string} outputPath
   * @returns {Promise<string>}
   */
  async write(definition, outputPath) {
    if (
      !definition ||
      typeof definition !== 'object' ||
      Array.isArray(definition)
    ) {
      throw new TypeError(
        'definition debe ser un objeto válido'
      );
    }

    if (
      typeof outputPath !== 'string' ||
      outputPath.trim() === ''
    ) {
      throw new TypeError(
        'outputPath debe ser una ruta válida'
      );
    }

    const resolvedPath = path.resolve(outputPath);
    const outputDirectory = path.dirname(resolvedPath);

    await fs.mkdir(outputDirectory, {
      recursive: true
    });

    const content = `${JSON.stringify(
      definition,
      null,
      2
    )}\n`;

    await fs.writeFile(
      resolvedPath,
      content,
      'utf8'
    );

    return resolvedPath;
  }
}

module.exports = DefinitionWriter;