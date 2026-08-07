'use strict';

const {
  Command
} = require(
  'commander'
);

const {
  loadForgeConfig
} = require(
  '../../../config/forge-config'
);

function getPasswordStatus() {
  return process.env
    .SBN_POSTGRES_PASSWORD
    ? 'configured'
    : 'not configured';
}

function registerConfigShowCommand(
  parentCommand
) {
  const command =
    new Command(
      'show'
    );

  command
    .description(
      'Muestra la configuración efectiva de SBN Forge.'
    )

    .option(
      '--config <file>',
      'Archivo de configuración de Forge.',
      'forge.config.json'
    )

    .action(
      async (
        options
      ) => {
        const configuration =
          await loadForgeConfig({
            rootDirectory:
              process.cwd(),

            configFile:
              options.config
          });

        console.log(
          ''
        );

        console.log(
          'SBN Forge Configuration'
        );

        console.log(
          '======================='
        );

        console.log(
          ''
        );

        console.log(
          'Source'
        );

        console.log(
          `  Provider : ${configuration.source.provider}`
        );

        console.log(
          `  Host     : ${configuration.source.host}`
        );

        console.log(
          `  Port     : ${configuration.source.port}`
        );

        console.log(
          `  Database : ${configuration.source.database || '(not configured)'}`
        );

        console.log(
          `  Schema   : ${configuration.source.schema}`
        );

        console.log(
          `  User     : ${configuration.source.user}`
        );

        console.log(
          `  Password : ${getPasswordStatus()}`
        );

        console.log(
          ''
        );

        console.log(
          'Project'
        );

        console.log(
          `  Framework    : ${configuration.project.framework}`
        );

        console.log(
          `  Module Root  : ${configuration.project.moduleRoot}`
        );

        console.log(
          `  API Prefix   : ${configuration.project.apiPrefix}`
        );

        console.log(
          `  Route Prefix : ${configuration.project.routePrefix}`
        );

        console.log(
          ''
        );

        console.log(
          'Generation'
        );

        console.log(
          `  Profile     : ${configuration.generation.profile}`
        );

        console.log(
          `  Definitions : ${configuration.generation.definitionsDirectory}`
        );

        console.log(
          `  Output      : ${configuration.generation.output}`
        );

        console.log(
          ''
        );

        console.log(
          `Config File: ${configuration.configFile}`
        );

        console.log(
          `Found: ${
            configuration.configFileFound
              ? 'yes'
              : 'no'
          }`
        );
      }
    );

  parentCommand.addCommand(
    command
  );
}

module.exports =
  registerConfigShowCommand;