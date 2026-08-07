'use strict';

const fs =
  require(
    'fs-extra'
  );

const path =
  require(
    'path'
  );

const PostgreSqlConfigTester =
  require(
    '../config/postgresql-config-tester'
  );

class ForgeDiagnosticsService {
  constructor(
    dependencies = {}
  ) {
    this.fs =
      dependencies.fs ||
      fs;

    this.rootDirectory =
      dependencies.rootDirectory ||
      process.cwd();

    this.postgreSqlTester =
      dependencies.postgreSqlTester ||
      new PostgreSqlConfigTester();
  }

  async run({
    configuration,
    password
  } = {}) {
    if (
      !configuration
    ) {
      throw new Error(
        'ForgeDiagnosticsService requiere configuration.'
      );
    }

    const checks = [];

    this.addCheck(
      checks,
      'configFileFound',
      configuration.configFileFound ===
        true,
      'forge.config.json encontrado'
    );

    this.addCheck(
      checks,
      'databaseConfigured',
      Boolean(
        configuration
          .source
          .database
      ),
      'Base de datos configurada'
    );

    this.addCheck(
      checks,
      'schemaConfigured',
      Boolean(
        configuration
          .source
          .schema
      ),
      'Schema configurado'
    );

    this.addCheck(
      checks,
      'userConfigured',
      Boolean(
        configuration
          .source
          .user
      ),
      'Usuario PostgreSQL configurado'
    );

    this.addCheck(
      checks,
      'passwordConfigured',
      Boolean(
        password
      ),
      'Contraseña PostgreSQL configurada'
    );

    this.addCheck(
      checks,
      'frameworkConfigured',
      Boolean(
        configuration
          .project
          .framework
      ),
      'Framework configurado'
    );

    this.addCheck(
      checks,
      'profileConfigured',
      Boolean(
        configuration
          .generation
          .profile
      ),
      'Perfil de generación configurado'
    );

    const definitionsDirectory =
      path.resolve(
        this.rootDirectory,
        configuration
          .generation
          .definitionsDirectory
      );

    const definitionsExists =
      await this.fs.pathExists(
        definitionsDirectory
      );

    this.addCheck(
      checks,
      'definitionsDirectoryExists',
      definitionsExists,
      `Directorio de definiciones: ${configuration.generation.definitionsDirectory}`
    );

    const outputDirectory =
      path.resolve(
        this.rootDirectory,
        configuration
          .generation
          .output
      );

    const outputWritable =
      await this.testWritableDirectory(
        outputDirectory
      );

    this.addCheck(
      checks,
      'outputWritable',
      outputWritable,
      `Directorio de salida escribible: ${configuration.generation.output}`
    );

    let databaseTest =
      null;

    if (
      password &&
      configuration
        .source
        .database
    ) {
      try {
        databaseTest =
          await this.postgreSqlTester.test({
            host:
              configuration
                .source
                .host,

            port:
              configuration
                .source
                .port,

            database:
              configuration
                .source
                .database,

            user:
              configuration
                .source
                .user,

            password,

            schema:
              configuration
                .source
                .schema
          });

        this.addCheck(
          checks,
          'postgresqlConnected',
          databaseTest.connected,
          'PostgreSQL conectado'
        );

        this.addCheck(
          checks,
          'databaseAccessible',
          databaseTest
            .databaseAccessible,
          `Base ${configuration.source.database} accesible`
        );

        this.addCheck(
          checks,
          'schemaExists',
          databaseTest.schemaExists,
          `Schema ${configuration.source.schema} encontrado`
        );

        this.addCheck(
          checks,
          'informationSchemaAccessible',
          databaseTest
            .informationSchemaAccessible,
          'Acceso a information_schema confirmado'
        );
      }
      catch (
        error
      ) {
        this.addCheck(
          checks,
          'postgresqlConnected',
          false,
          `PostgreSQL: ${error.message}`
        );
      }
    }

    const healthy =
      checks.every(
        check =>
          check.success ===
          true
      );

    return {
      healthy,

      checks,

      databaseTest,

      runtime: {
        nodeVersion:
          process.versions.node,

        platform:
          process.platform
      },

      configuration: {
        source:
          configuration.source,

        project:
          configuration.project,

        generation:
          configuration.generation
      }
    };
  }

  addCheck(
    checks,
    code,
    success,
    message
  ) {
    checks.push({
      code,
      success:
        success ===
        true,
      message
    });
  }

  async testWritableDirectory(
    directory
  ) {
    try {
      await this.fs.ensureDir(
        directory
      );

      const testFile =
        path.join(
          directory,
          '.sbn-forge-write-test'
        );

      await this.fs.writeFile(
        testFile,
        'ok',
        'utf8'
      );

      await this.fs.remove(
        testFile
      );

      return true;
    }
    catch {
      return false;
    }
  }
}

module.exports =
  ForgeDiagnosticsService;