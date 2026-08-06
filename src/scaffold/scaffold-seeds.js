'use strict';

async function readExistingSeeds(
  fs,
  definitionFile,
  logger
) {
  if (
    !await fs.pathExists(
      definitionFile
    )
  ) {
    return [];
  }

  try {
    const definition =
      await fs.readJson(
        definitionFile
      );

    const seeds =
      Array.isArray(
        definition.seeds
      )
        ? definition.seeds
        : [];

    if (
      seeds.length > 0
    ) {
      logger.line(
        `Seeds existentes detectados: ${seeds.length}`
      );
    }

    return seeds;
  }
  catch {
    logger.warning(
      'No fue posible leer la definición anterior para preservar sus seeds.'
    );

    return [];
  }
}

async function restoreSeeds(
  fs,
  definitionFile,
  seeds
) {
  const definition =
    await fs.readJson(
      definitionFile
    );

  definition.seeds =
    seeds;

  await fs.writeJson(
    definitionFile,
    definition,
    {
      spaces:
        2
    }
  );
}

module.exports = {
  readExistingSeeds,
  restoreSeeds
};