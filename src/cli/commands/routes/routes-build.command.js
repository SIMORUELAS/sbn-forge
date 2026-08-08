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

const ForgeRoutesRegistryGenerator =
  require(
    '../../../generators/registry/forge-routes-registry.generator'
  );

function registerRoutesBuildCommand(
  parentCommand
) {
  const command =
    new Command(
      'build'
    );

  command
    .description(
      'Construye el registro global de rutas generadas por Forge.'
    )

    .option(
      '--config <file>',
      'Archivo de configuración.',
      'forge.config.json'
    )

    .option(
      '--output <directory>',
      'Directorio del registro global.',
      './generated'
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

        const generator =
          new ForgeRoutesRegistryGenerator({
            rootDirectory:
              process.cwd()
          });

        /*
         * Importante:
         * tus módulos generados físicamente están
         * dentro de generation.output/modules.
         *
         * El moduleRoot del proyecto representa la
         * ruta de instalación final, no necesariamente
         * la carpeta física del output de Forge.
         */
        const modulesDirectory =
          `${configuration.generation.output}/modules`;

        const result =
          await generator.generate({
            modulesDirectory,

            outputDirectory:
              options.output
          });

        console.log(
          ''
        );

        console.log(
          'SBN Forge Route Registry'
        );

        console.log(
          '========================'
        );

        console.log(
          ''
        );

        console.log(
          `Módulos registrados: ${result.modules.length}`
        );

        console.log(
          `Archivo: ${result.registryFile}`
        );
      }
    );

  parentCommand.addCommand(
    command
  );
}

module.exports =
  registerRoutesBuildCommand;