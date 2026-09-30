'use strict';

const fs = require('fs-extra');
const os = require('os');
const path = require('path');

const {
  Command
} = require('commander');

const registerRoutesBuildCommand =
  require(
    '../src/cli/commands/routes/routes-build.command'
  );

describe(
  'Routes Build Command',
  () => {
    test(
      'construye el registry desde los m�dulos instalados',
      async () => {
        const projectRoot =
          await fs.mkdtemp(
            path.join(
              os.tmpdir(),
              'forge-routes-installed-'
            )
          );

        try {
          const modulesRoot =
            path.join(
              projectRoot,
              'src',
              'modules_ia'
            );

          const generatedRoot =
            path.join(
              projectRoot,
              'src',
              'generated'
            );

          const moduleNames = [
            'ai-agents',
            'ai-business-model-installations',
            'ai-business-models'
          ];

          for (
            const moduleName
            of moduleNames
          ) {
            const moduleDirectory =
              path.join(
                modulesRoot,
                moduleName
              );

            await fs.ensureDir(
              moduleDirectory
            );

            await fs.writeFile(
              path.join(
                moduleDirectory,
                `${moduleName}.routes.js`
              ),
              [
                "'use strict';",
                '',
                'async function routes() {}',
                '',
                'module.exports = routes;',
                ''
              ].join('\n'),
              'utf8'
            );

            await fs.writeJson(
              path.join(
                moduleDirectory,
                'sbn-forge.manifest.json'
              ),
              {
                module: {
                  name: moduleName
                }
              },
              {
                spaces: 2
              }
            );
          }

          const program =
            new Command();

          program.exitOverride();

          const routesCommand =
            program.command(
              'routes'
            );

          registerRoutesBuildCommand(
            routesCommand
          );

          await program.parseAsync(
            [
              'node',
              'test',
              'routes',
              'build',
              '--installed',
              '--project-root',
              projectRoot,
              '--output',
              generatedRoot
            ]
          );

          const registryPath =
            path.join(
              generatedRoot,
              'sbn-forge.routes.js'
            );

          expect(
            await fs.pathExists(
              registryPath
            )
          ).toBe(true);

          const registry =
            await fs.readFile(
              registryPath,
              'utf8'
            );

          expect(
            registry
          ).toContain(
            '../modules_ia/ai-agents/ai-agents.routes'
          );

          expect(
            registry
          ).toContain(
            '../modules_ia/ai-business-model-installations/ai-business-model-installations.routes'
          );

          expect(
            registry
          ).toContain(
            '../modules_ia/ai-business-models/ai-business-models.routes'
          );

          expect(
            registry
          ).toContain(
            'await fastify.register('
          );

          const registrations =
            registry.match(
              /await fastify\.register\(/g
            ) || [];

          expect(
            registrations
          ).toHaveLength(3);
        } finally {
          await fs.remove(
            projectRoot
          );
        }
      }
    );

    test(
      'requiere project-root cuando se usa installed',
      async () => {
        const program =
          new Command();

        program.exitOverride();

        const routesCommand =
          program.command(
            'routes'
          );

        registerRoutesBuildCommand(
          routesCommand
        );

        await expect(
          program.parseAsync(
            [
              'node',
              'test',
              'routes',
              'build',
              '--installed'
            ]
          )
        ).rejects.toThrow(
          'Debe indicar --project-root cuando utiliza --installed.'
        );
      }
    );
  }
);
