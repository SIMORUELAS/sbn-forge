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

const ForgeDiagnosticsService =
  require(
    '../../../diagnostics/forge-diagnostics.service'
  );

function printCheck(
  check
) {
  console.log(
    `${check.success ? '✓' : '✗'} ${check.message}`
  );
}

function registerConfigTestCommand(
  parentCommand
) {
  const command =
    new Command(
      'test'
    );

  command
    .description(
      'Valida la configuración y conectividad de SBN Forge.'
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

        const diagnostics =
          new ForgeDiagnosticsService({
            rootDirectory:
              process.cwd()
          });

        const result =
          await diagnostics.run({
            configuration,

            password:
              process.env
                .SBN_POSTGRES_PASSWORD
          });

        console.log(
          ''
        );

        console.log(
          'SBN Forge Configuration Test'
        );

        console.log(
          '============================'
        );

        console.log(
          ''
        );

        for (
          const check of
          result.checks
        ) {
          printCheck(
            check
          );
        }

        console.log(
          ''
        );

        if (
          result.healthy
        ) {
          console.log(
            'Configuration OK'
          );

          return;
        }

        console.log(
          'Configuration INVALID'
        );

        process.exitCode =
          1;
      }
    );

  parentCommand.addCommand(
    command
  );
}

module.exports =
  registerConfigTestCommand;