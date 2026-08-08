'use strict';

const path =
  require(
    'path'
  );

const fs =
  require(
    'fs-extra'
  );

class FileWriter {
  constructor({
    force = false,
    dryRun = false,
    writeMode
  } = {}) {
    this.force =
      force === true;

    this.dryRun =
      dryRun === true;

    /*
     * Compatibilidad:
     *
     * force=true
     * siempre implica modo force.
     *
     * Sin writeMode:
     * conserva comportamiento histórico create.
     */
    this.writeMode =
      this.force
        ? 'force'
        : (
            writeMode ||
            'create'
          );

    const validModes =
      new Set([
        'create',
        'safe',
        'force'
      ]);

    if (
      !validModes.has(
        this.writeMode
      )
    ) {
      throw new Error(
        `Modo de escritura no soportado: ${this.writeMode}`
      );
    }
  }

  async write(
    file,
    content
  ) {
    const absolute =
      path.resolve(
        file
      );

    const exists =
      await fs.pathExists(
        absolute
      );

    /*
     * CREATE
     *
     * Protege contra sobrescritura.
     *
     * Es el comportamiento histórico
     * de FileWriter.
     */
    if (
      exists &&
      this.writeMode ===
        'create'
    ) {
      throw new Error(
        'El archivo ya existe y no se autorizó ' +
        `sobrescritura: ${absolute}. ` +
        'Use --force o regeneración segura.'
      );
    }

    /*
     * SAFE
     *
     * Permite regenerar el archivo solicitado
     * por un Generator de Forge.
     *
     * No elimina archivos externos/custom.
     */
    const overwritten =
      exists &&
      (
        this.writeMode ===
          'safe' ||
        this.writeMode ===
          'force'
      );

    if (
      !this.dryRun
    ) {
      await fs.ensureDir(
        path.dirname(
          absolute
        )
      );

      await fs.writeFile(
        absolute,
        content,
        'utf8'
      );
    }

    return {
      absolutePath:
        absolute,

      written:
        !this.dryRun,

      overwritten
    };
  }
}

module.exports = {
  FileWriter
};