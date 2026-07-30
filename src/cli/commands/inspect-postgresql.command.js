'use strict';

const path = require('path');
const chalk = require('chalk');
const ora = require('ora');

const {
  PostgresDatasource
} = require('../../datasources/postgresql');

const PostgreSqlInspector = require(
  '../../inspectors/postgresql/postgresql-inspector'
);

const MetadataNormalizer = require(
  '../../context/metadata-normalizer'
);

const DefinitionBuilder = require(
  '../../core/definition-builder'
);

const DefinitionWriter = require(
  '../../core/definition-writer'
);

/**
 * Registra el comando:
 *
 * sbn-forge inspect postgresql <table>
 */
function registerInspectPostgresqlCommand(parent) {
  parent
    .command('postgresql <table>')
    .description(
      'Inspecciona una tabla PostgreSQL y genera su definición JSON'
    )
    .requiredOption(
      '-s, --schema <schema>',
      'Schema PostgreSQL'
    )
    .option(
      '-o, --output <file>',
      'Archivo JSON de salida'
    )
    .option(
      '--host <host>',
      'Servidor PostgreSQL'
    )
    .option(
      '--port <port>',
      'Puerto PostgreSQL'
    )
    .option(
      '--database <database>',
      'Base de datos PostgreSQL'
    )
    .option(
      '--user <user>',
      'Usuario PostgreSQL'
    )
    .option(
      '--password <password>',
      'Contraseña PostgreSQL'
    )
    .option(
      '--ssl',
      'Habilita conexión SSL',
      false
    )
    .option(
      '--quiet',
      'Reduce la salida del CLI',
      false
    )
    .action(async (table, options) => {
      const cwd = process.cwd();

      const datasource =
        new PostgresDatasource({
          host:
            options.host ||
            process.env.SBN_FORGE_DB_HOST,

          port: Number(
            options.port ||
            process.env.SBN_FORGE_DB_PORT ||
            5432
          ),

          database:
            options.database ||
            process.env.SBN_FORGE_DB_NAME,

          user:
            options.user ||
            process.env.SBN_FORGE_DB_USER,

          password:
            options.password ||
            process.env.SBN_FORGE_DB_PASSWORD,

          ssl:
            options.ssl ||
            process.env.SBN_FORGE_DB_SSL === 'true'
              ? {
                  rejectUnauthorized: false
                }
              : false
        });

      const outputPath = path.resolve(
        cwd,
        options.output ||
          path.join(
            'examples',
            `${table}.json`
          )
      );

      const spinner = options.quiet
        ? null
        : ora(
          `Inspeccionando ${options.schema}.${table}`
        ).start();

      try {
        const inspector =
          new PostgreSqlInspector(datasource);

        const normalizer =
          new MetadataNormalizer();

        const builder =
          new DefinitionBuilder();

        const writer =
          new DefinitionWriter();

        const metadata =
          await inspector.inspect({
            schema: options.schema,
            table
          });

        const normalizedMetadata =
          normalizer.normalize(metadata);

        const definition =
          builder.build(normalizedMetadata);

        const writtenPath =
          await writer.write(
            definition,
            outputPath
          );

        spinner?.succeed(
          'Inspección PostgreSQL completada'
        );

        if (!options.quiet) {
          console.log('');

          console.log(
            chalk.green(
              'Definición generada correctamente.'
            )
          );

          console.log(
            chalk.gray(
              `Tabla: ${options.schema}.${table}`
            )
          );

          console.log(
            chalk.gray(
              `Archivo: ${writtenPath}`
            )
          );
        }
      } catch (error) {
        spinner?.fail(
          'No fue posible inspeccionar la tabla'
        );

        throw error;
      } finally {
        await datasource.close();
      }
    });
}

module.exports = {
  registerInspectPostgresqlCommand
};