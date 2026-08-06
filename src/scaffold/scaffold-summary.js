'use strict';

const path = require('path');

async function listGeneratedFiles(fs, moduleDirectory) {
  const files = [];

  const walk = async currentDirectory => {
    const entries = await fs.readdir(currentDirectory, {
      withFileTypes: true
    });

    for (const entry of entries) {
      const absolutePath = path.join(currentDirectory, entry.name);

      if (entry.isDirectory()) {
        await walk(absolutePath);
        continue;
      }

      if (entry.isFile()) {
        files.push(path.relative(moduleDirectory, absolutePath));
      }
    }
  };

  await walk(moduleDirectory);
  return files.sort((left, right) => left.localeCompare(right));
}

function printSummary(logger, result) {
  logger.section('Proceso completado correctamente');
  logger.line(
    `Tabla:      ${result.source.schema}.${result.source.table}`
  );
  logger.line(`Base:       ${result.source.database}`);
  logger.line(`Definición: ${result.definitionFile}`);
  logger.line(`Módulo:     ${result.moduleDirectory}`);
  logger.line(`Perfil:     ${result.profile}`);
  logger.line(`Manifest:   ${result.manifestFile}`);
  logger.line(`Seeds:      ${result.seedCount}`);

  if (logger.quiet) {
    return;
  }

  console.log('');
  console.log('Archivos generados:');

  for (const generatedFile of result.generatedFiles) {
    console.log(`  [ok] ${generatedFile}`);
  }
}

module.exports = {
  listGeneratedFiles,
  printSummary
};
