'use strict';

const {
  Command
} = require(
  'commander'
);

const PostgreSqlScaffoldService =
  require(
    '../../../scaffold/postgresql-scaffold.service'
  );

function registerPostgreSqlScaffoldCommand(
  parentCommand
) {

  const command =
    new Command(
      'postgresql'
    );

  command

    .description(
      'Inspecciona una tabla PostgreSQL y genera un módulo completo.'
    )

    .argument(
      '<table>',
      'Nombre de la tabla.'
    )

    .option(
      '--schema <schema>',
      'Schema PostgreSQL.',
      'public'
    )

    .option(
      '--host <host>',
      'Servidor PostgreSQL.',
      'localhost'
    )

    .option(
      '--port <port>',
      'Puerto PostgreSQL.',
      '5432'
    )

    .option(
      '--database <database>',
      'Base de datos.'
    )

    .option(
      '--user <user>',
      'Usuario.',
      'postgres'
    )

    .option(
      '--password <password>',
      'Contraseña.'
    )

    .option(
      '--profile <profile>',
      'Perfil de generación.',
      'sbn-api-v2'
    )

    .option(
      '--definitions-dir <directory>',
      'Directorio donde se almacenan las definiciones.',
      './examples'
    )

    .option(
      '--output <directory>',
      'Directorio de salida.',
      './output'
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
      'Modo silencioso.'
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

            schema:
              options.schema,

            host:
              options.host,

            port:
              Number(
                options.port
              ),

            database:
              options.database,

            user:
              options.user,

            password:
              options.password,

            profile:
              options.profile,

            definitionsDirectory:
              options.definitionsDir,

            output:
              options.output,

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
            error.message
          );

          process.exit(1);

        }

      }
    );

  parentCommand.addCommand(
    command
  );

}

module.exports =
  registerPostgreSqlScaffoldCommand;