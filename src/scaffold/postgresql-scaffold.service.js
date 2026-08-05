'use strict';

const path =
  require(
    'path'
  );

const fs =
  require(
    'fs-extra'
  );

const ScaffoldLogger =
  require(
    './scaffold-logger'
  );

const ScaffoldRunner =
  require(
    './scaffold-runner'
  );

const ScaffoldSeedBuilder =
  require(
    './scaffold-seed-builder'
  );

const {
  normalizeOptions,
  validateOptions
} = require(
  './scaffold-options'
);

const {
  loadForgeConfig,
  mergeForgeConfiguration
} = require(
  '../config/forge-config'
);

const {
  preparePaths
} = require(
  './scaffold-paths'
);

const {
  readExistingSeeds,
  restoreSeeds
} = require(
  './scaffold-seeds'
);

const {
  ensureDirectoryExists,
  ensureFileExists,
  readAndValidateDefinition,
  validateSeeds
} = require(
  './scaffold-validator'
);

const {
  listGeneratedFiles,
  printSummary
} = require(
  './scaffold-summary'
);

class PostgreSqlScaffoldService {
  constructor(
    dependencies = {}
  ) {
    this.fs =
      dependencies.fs ||
      fs;

    this.rootDirectory =
      dependencies.rootDirectory ||
      path.resolve(
        __dirname,
        '..',
        '..'
      );

    this.runner =
      dependencies.runner ||
      new ScaffoldRunner({
        spawn:
          dependencies.spawn,

        rootDirectory:
          this.rootDirectory,

        nodeExecutable:
          dependencies.nodeExecutable,

        npmExecutable:
          dependencies.npmExecutable
      });

    this.seedBuilder =
      dependencies.seedBuilder ||
      new ScaffoldSeedBuilder();
  }

     async execute(
      options = {}
    ) {

      const normalizedOptions =
        normalizeOptions(
          options
        );

      const forgeConfig =
        await loadForgeConfig({

          rootDirectory:
            this.rootDirectory,

          configFile:
            normalizedOptions.configFile

        });

      const projectConfiguration =
        mergeForgeConfiguration({

          fileConfig:
            forgeConfig,

          cliOptions: {

            framework:
              normalizedOptions.framework,

            moduleRoot:
              normalizedOptions.moduleRoot,

            apiPrefix:
              normalizedOptions.apiPrefix,

            routePrefix:
              normalizedOptions.routePrefix

          }

        });

      const configuration = {

        ...normalizedOptions,

        ...projectConfiguration,

        forgeConfigFile:
          forgeConfig.configFile,

        forgeConfigFileFound:
          forgeConfig.configFileFound

      };

      validateOptions(
        configuration
      );

      const logger =
        new ScaffoldLogger(
          configuration.quiet
        );


    const paths =
      await preparePaths(
        this.fs,
        this.rootDirectory,
        configuration
      );

    const existingSeeds =
      await readExistingSeeds(
        this.fs,
        paths.definitionFile,
        logger
      );

    logger.section(
      `1. Inspeccionando PostgreSQL: ` +
      `${configuration.schema}.` +
      `${configuration.table}`
    );

    await this.runner.inspectPostgreSql(
      configuration,
      paths
    );

    await ensureFileExists(
      this.fs,
      paths.definitionFile,
      'No se generó el archivo de definición'
    );

    if (
      existingSeeds.length >
      0
    ) {
      await restoreSeeds(
        this.fs,
        paths.definitionFile,
        existingSeeds
      );

      logger.line(
        `Seeds restaurados: ` +
        `${existingSeeds.length}`
      );
    }
    else {
      logger.line(
        'No se detectaron seeds personalizados para preservar.'
      );
    }

    logger.section(
      '2. Validando definición JSON'
    );

    const definition =
      await readAndValidateDefinition(
        this.fs,
        paths.definitionFile
      );

    /*
     * Cuando la definición no contiene seeds,
     * Forge genera automáticamente un seed
     * de ejemplo basado en las columnas
     * escribibles.
     */
    if (
      !Array.isArray(
        definition.seeds
      ) ||
      definition.seeds.length ===
        0
    ) {
      definition.seeds =
        this.seedBuilder.build(
          definition
        );

      await this.fs.writeJson(
        paths.definitionFile,
        definition,
        {
          spaces:
            2
        }
      );

      logger.line(
        'Seed de ejemplo generado automáticamente.'
      );
    }

    /*
     * Valida valores provisionales que no
     * deberían llegar al SQL generado, por
     * ejemplo REEMPLAZAR_UUID_*.
     *
     * Los placeholders {{VARIABLE}} generados
     * por ScaffoldSeedBuilder están permitidos.
     */
    validateSeeds(
      definition
    );

    const seedCount =
      Array.isArray(
        definition.seeds
      )
        ? definition.seeds.length
        : 0;

    logger.line(
      `Definición válida: ` +
      `${paths.definitionFile}`
    );

    logger.line(
      `Schema:   ${definition.schema}`
    );

    logger.line(
      `Tabla:    ${definition.table}`
    );

    logger.line(
      `Columnas: ` +
      `${definition.columns.length}`
    );

    logger.line(
      `Seeds:    ${seedCount}`
    );

    logger.section(
      `3. Generando módulo con perfil ` +
      `${configuration.profile}`
    );

    await this.runner.generateModule(
      configuration,
      paths
    );

    await ensureDirectoryExists(
      this.fs,
      paths.moduleDirectory,
      'No se generó el directorio del módulo'
    );

    await ensureFileExists(
      this.fs,
      paths.manifestFile,
      'No se generó el manifest'
    );

    if (
      configuration.runTests
    ) {
      logger.section(
        '4. Ejecutando pruebas'
      );

      await this.runner.runNpmCommand(
        [
          'test'
        ],
        configuration
      );
    }

    if (
      configuration.runLint
    ) {
      logger.section(
        configuration.runTests
          ? '5. Ejecutando ESLint'
          : '4. Ejecutando ESLint'
      );

      await this.runner.runNpmCommand(
        [
          'run',
          'lint'
        ],
        configuration
      );
    }

    const generatedFiles =
      await listGeneratedFiles(
        this.fs,
        paths.moduleDirectory
      );

    const result = {
      source: {
        type:
          'postgresql',

        schema:
          configuration.schema,

        table:
          configuration.table,

        database:
          configuration.database
      },

      profile:
        configuration.profile,

      definitionFile:
        paths.definitionFile,

      moduleDirectory:
        paths.moduleDirectory,

      manifestFile:
        paths.manifestFile,

      seedCount,

      generatedFiles
    };

    printSummary(
      logger,
      result
    );

    return result;
  }

  /*
   * Método público conservado para pruebas
   * unitarias y compatibilidad con la versión
   * anterior del servicio.
   */
  validateSeeds(
    definition
  ) {
    return validateSeeds(
      definition
    );
  }

  /*
   * Método público para probar directamente
   * la generación automática de seeds.
   */
  buildSeeds(
    definition
  ) {
    return this.seedBuilder.build(
      definition
    );
  }
}

module.exports =
  PostgreSqlScaffoldService;
