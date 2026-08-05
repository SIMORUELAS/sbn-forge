'use strict';

const path = require('path');
const chalk = require('chalk');
const ora = require('ora');

const {
  loadConfig
} = require('../../core/config-loader');

const {
  loadDefinition
} = require('../../core/definition-loader');

const {
  createGenerationPipeline
} = require(
  '../../pipeline/create-generation-pipeline'
);

const {
  Logger
} = require('../../core/logger');

function registerGenerateApiCommand(parent) {
  parent
    .command('api <table>')
    .description(
      'Genera un módulo backend desde una definición JSON'
    )
    .option(
      '-s, --schema <schema>',
      'Schema PostgreSQL'
    )
    .option(
      '-d, --definition <file>',
      'Archivo JSON de definición'
    )
    .option(
      '-o, --output <directory>',
      'Directorio de salida'
    )
    .option(
      '--force',
      'Autoriza sobrescritura de archivos generados',
      false
    )
    .option(
      '--dry-run',
      'Muestra el plan sin escribir archivos',
      false
    )
    .option(
      '--quiet',
      'Reduce la salida del CLI',
      false
    )
    .option(
      '--profile <profile>',
      'Perfil de generación',
      'generic'
    )
    .option(
      '--framework <framework>',
      'Framework backend.',
      'fastify'
    )

    .option(
      '--module-root <directory>',
      'Directorio de módulos.',
      'modules'
    )

    .option(
      '--api-prefix <prefix>',
      'Prefijo de registro de la API.',
      '/api'
    )

    .option(
      '--route-prefix <prefix>',
      'Prefijo funcional de las rutas.',
      '/ia'
    )
    .action(async (table, options) => {
      const cwd = process.cwd();

      const config =
        await loadConfig(cwd);

      const logger =
        new Logger({
          quiet: options.quiet
        });

      const definitionPath =
        options.definition ||
        path.join(
          cwd,
          'examples',
          `${table}.json`
        );

      const output =
        path.resolve(
          cwd,
          options.output ||
            config.defaultOutput ||
            './output'
        );

      const spinner =
        options.quiet
          ? null
          : ora(
              'Ejecutando Generation Pipeline'
            ).start();

      try {
        const definition =
          await loadDefinition(
            definitionPath
          );

        /*
         * Permite sobrescribir el schema
         * desde la línea de comandos.
         */
        if (options.schema) {
          definition.schema =
            options.schema;
        }

        /*
         * Propaga el perfil seleccionado
         * hacia la definición.
         *
         * Se conserva en ambas propiedades
         * para mantener compatibilidad con:
         *
         * - definition.profile
         * - definition.generation.profile
         */
        definition.profile =
          options.profile;

         definition.generation = {
          ...(definition.generation || {}),

          profile:
            options.profile,

          framework:
            options.framework,

          moduleRoot:
            options.moduleRoot,

          apiPrefix:
            options.apiPrefix,

          routePrefix:
            options.routePrefix
        };      



        /*
         * Verifica que la tabla proporcionada
         * en el comando coincida con la definición.
         */
        if (
          definition.table !== table
        ) {
          throw new Error(
            `La tabla del comando (${table}) ` +
            'no coincide con la definición ' +
            `(${definition.table}).`
          );
        }

        const pipeline =
          createGenerationPipeline({
            generatorVersion:
              '0.1.0'
          });

        const pipelineResult =
          await pipeline.execute({
            type:
              'api',

            definition,

            options: {
          output,

          force:
            options.force,

          dryRun:
            options.dryRun,

          quiet:
            options.quiet,

          profile:
            options.profile,

          framework:
            options.framework,

          moduleRoot:
            options.moduleRoot,

          apiPrefix:
            options.apiPrefix,

          routePrefix:
            options.routePrefix,

          logger
        }

          });

        spinner?.succeed(
          'Generation Pipeline completado'
        );

        const result =
          pipelineResult.generation;

        logger.success(
          options.dryRun
            ? 'Dry-run completado: ' +
              `${result.files.length} ` +
              'archivos planificados.'
            : 'Módulo generado: ' +
              result.moduleDirectory
        );

        if (!options.quiet) {
          console.log(
            chalk.gray(
              `Perfil: ${options.profile}`
            )
          );

          console.log(
            chalk.gray(
              `Framework: ${options.framework}`
            )
          );

          console.log(
            chalk.gray(
              `Módulos: ${options.moduleRoot}`
            )
          );

          console.log(
            chalk.gray(
              `Prefijo API: ${options.apiPrefix}`
            )
          );

          console.log(
            chalk.gray(
              `Prefijo funcional: ${options.routePrefix}`
            )
          );

          console.log(
            chalk.gray(
              `Manifest: ${result.manifestPath}`
            )
          );

          for (
            const file of result.files
          ) {
            const status =
              options.dryRun
                ? '[plan]'
                : '[ok]';

            console.log(
              chalk.gray(
                `  ${status} ` +
                  file.relativePath
              )
            );
          }
        }
      } catch (error) {
        spinner?.fail(
          'No fue posible generar el módulo'
        );

        throw error;
      }
    });
}

module.exports = {
  registerGenerateApiCommand
};