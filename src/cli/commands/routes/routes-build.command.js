'use strict';

const path =
  require(
    'path'
  );

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

    .option(
      '--installed',
      'Construye el registro usando los módulos instalados en el proyecto.',
      false
    )

    .option(
      '--project-root <directory>',
      'Directorio raíz del proyecto donde están instalados los módulos.'
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

        let modulesDirectory;
        let outputDirectory;

        if (
          options.installed
        ) {
          if (
            !options.projectRoot
          ) {
            throw new Error(
              'Debe indicar --project-root cuando utiliza --installed.'
            );
          }

          const projectRoot =
            path.resolve(
              options.projectRoot
            );

          modulesDirectory =
            path.join(
              projectRoot,
              'src',
              configuration
                .project
                .moduleRoot
            );

          outputDirectory =
            path.join(
              projectRoot,
              'src',
              'generated'
            );
        }
        else {
          modulesDirectory =
            `${configuration.generation.output}/modules`;

          outputDirectory =
            options.output;
        }

        const result =
          await generator.generate({
            modulesDirectory,
            outputDirectory
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
