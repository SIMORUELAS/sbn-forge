'use strict';

const {
  Command
} = require(
  'commander'
);

const {
  loadForgeConfig
} = require(
  '../../config/forge-config'
);

const ForgeDiagnosticsService =
  require(
    '../../diagnostics/forge-diagnostics.service'
  );

function printCheck(
  check
) {
  console.log(
    `${check.success ? '✓' : '✗'} ${check.message}`
  );
}

function registerDoctorCommand(
  parentCommand
) {
  const command =
    new Command(
      'doctor'
    );

  command
    .description(
      'Diagnostica el entorno y la configuración de SBN Forge.'
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
        console.log(
          ''
        );

        console.log(
          'SBN Forge Doctor'
        );

        console.log(
          '================'
        );

        console.log(
          ''
        );

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
          'Runtime'
        );

        console.log(
          `✓ Node.js ${result.runtime.nodeVersion}`
        );

        console.log(
          `✓ Platform ${result.runtime.platform}`
        );

        console.log(
          ''
        );

        console.log(
          'Diagnostics'
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
            'Forge Environment OK'
          );

          return;
        }

        console.log(
          'Forge Environment INVALID'
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
  registerDoctorCommand;