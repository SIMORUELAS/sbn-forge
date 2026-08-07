'use strict';

const {
  Command
} = require(
  'commander'
);

const PostgreSqlScaffoldService =
  require(
    '../../scaffold/postgresql-scaffold.service'
  );

/**
 * Registra el comando corto:
 *
 * forge scaffold-table <table>
 *
 * El comando obtiene la mayor parte de la
 * configuración desde forge.config.json.
 *
 * Prioridad:
 *
 * 1. Valores predeterminados de Forge
 * 2. forge.config.json
 * 3. Variables de entorno
 * 4. Opciones proporcionadas por CLI
 */
function registerScaffoldTableCommand(
  parentCommand
) {
  const command =
    new Command(
      'scaffold-table'
    );

  command
    .description(
      'Genera un módulo desde una tabla usando la configuración del proyecto.'
    )

    .argument(
      '<table>',
      'Nombre de la tabla PostgreSQL.'
    )

    .option(
      '--config <file>',
      'Archivo de configuración de Forge.',
      'forge.config.json'
    )

    /*
     * Opciones del origen PostgreSQL.
     *
     * No tienen valores predeterminados aquí,
     * porque forge.config.json debe poder
     * proporcionar esos valores.
     */
    .option(
      '--schema <schema>',
      'Sobrescribe el schema PostgreSQL configurado.'
    )

    .option(
      '--host <host>',
      'Sobrescribe el servidor PostgreSQL configurado.'
    )

    .option(
      '--port <port>',
      'Sobrescribe el puerto PostgreSQL configurado.'
    )

    .option(
      '--database <database>',
      'Sobrescribe la base de datos configurada.'
    )

    .option(
      '--user <user>',
      'Sobrescribe el usuario PostgreSQL configurado.'
    )

    .option(
      '--password <password>',
      'Contraseña PostgreSQL. También puede usar SBN_POSTGRES_PASSWORD.'
    )

    /*
     * Opciones del proyecto destino.
     *
     * Tampoco tienen valores predeterminados
     * para no sobrescribir forge.config.json.
     */
    .option(
      '--framework <framework>',
      'Sobrescribe el framework backend configurado.'
    )

    .option(
      '--module-root <directory>',
      'Sobrescribe el directorio de módulos configurado.'
    )

    .option(
      '--api-prefix <prefix>',
      'Sobrescribe el prefijo de registro de la API.'
    )

    .option(
      '--route-prefix <prefix>',
      'Sobrescribe el prefijo funcional de las rutas.'
    )

    /*
     * Opciones de generación.
     */
    .option(
      '--profile <profile>',
      'Sobrescribe el perfil de generación configurado.'
    )

    .option(
      '--definitions-dir <directory>',
      'Sobrescribe el directorio de definiciones.'
    )

    .option(
      '--output <directory>',
      'Sobrescribe el directorio de salida.'
    )

    .option(
      '--force',
      'Sobrescribir archivos existentes.'
    )

    .option(
      '--test',
      'Ejecutar pruebas Jest después de generar.'
    )

    .option(
      '--lint',
      'Ejecutar ESLint después de generar.'
    )

    .option(
      '--quiet',
      'Reduce la salida del CLI.'
    )

    .action(
      async (
        table,
        options
      ) => {
        const service =
          new PostgreSqlScaffoldService();

        try {
          await service.execute({
            table,

            configFile:
              options.config,

            /*
             * Configuración PostgreSQL.
             */
            schema:
              options.schema,

            host:
              options.host,

            port:
              options.port ===
                undefined
                ? undefined
                : Number(
                    options.port
                  ),

            database:
              options.database,

            user:
              options.user,

            password:
              options.password,

            /*
             * Configuración del proyecto.
             */
            framework:
              options.framework,

            moduleRoot:
              options.moduleRoot,

            apiPrefix:
              options.apiPrefix,

            routePrefix:
              options.routePrefix,

            /*
             * Configuración de generación.
             */
            profile:
              options.profile,

            definitionsDirectory:
              options.definitionsDir,

            output:
              options.output,

            /*
             * Opciones operativas.
             */
            force:
              Boolean(
                options.force
              ),

            runTests:
              Boolean(
                options.test
              ),

            runLint:
              Boolean(
                options.lint
              ),

            quiet:
              Boolean(
                options.quiet
              )
          });
        }
        catch (
          error
        ) {
          console.error(
            ''
          );

          console.error(
            'SBN Forge Scaffold Error'
          );

          console.error(
            error.stack ||
            error.message
          );

          process.exitCode =
            1;
        }
      }
    );

  parentCommand.addCommand(
    command
  );
}

module.exports =
  registerScaffoldTableCommand;