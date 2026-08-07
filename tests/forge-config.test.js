'use strict';

const path =
  require(
    'path'
  );

const fs =
  require(
    'fs-extra'
  );

const os =
  require(
    'os'
  );

const {
  DEFAULT_FORGE_CONFIG,
  loadForgeConfig,
  mergeForgeConfiguration,
  normalizeForgeConfig
} = require(
  '../src/config/forge-config'
);

describe(
  'Forge Config',
  () => {
    let temporaryDirectory;

    beforeEach(
      async () => {
        temporaryDirectory =
          await fs.mkdtemp(
            path.join(
              os.tmpdir(),
              'sbn-forge-config-'
            )
          );
      }
    );

    afterEach(
      async () => {
        await fs.remove(
          temporaryDirectory
        );
      }
    );

    test(
      'usa valores predeterminados cuando no existe el archivo',
      async () => {
        const configuration =
          await loadForgeConfig({
            rootDirectory:
              temporaryDirectory
          });

        expect(
          configuration.source
        ).toEqual({
          provider:
            'postgresql',

          schema:
            'public',

          host:
            'localhost',

          port:
            5432,

          database:
            null,

          user:
            'postgres'
        });

        expect(
          configuration.project
        ).toEqual({
          framework:
            'fastify',

          moduleRoot:
            'modules',

          apiPrefix:
            '/api',

          routePrefix:
            '/ia'
        });

        expect(
          configuration.generation
        ).toEqual({
          profile:
            'sbn-api-v2',

          definitionsDirectory:
            './examples',

          output:
            './output'
        });

        expect(
          configuration.configFileFound
        ).toBe(
          false
        );

        expect(
          configuration.configFile
        ).toBe(
          path.join(
            temporaryDirectory,
            'forge.config.json'
          )
        );
      }
    );

    test(
      'lee forge.config.json',
      async () => {
        await fs.writeJson(
          path.join(
            temporaryDirectory,
            'forge.config.json'
          ),
          {
            source: {
              provider:
                'postgresql',

              schema:
                'simo_ai',

              host:
                'localhost',

              port:
                5432,

              database:
                'sbn_portal_test',

              user:
                'postgres'
            },

            project: {
              framework:
                'fastify',

              moduleRoot:
                'modules_ia',

              apiPrefix:
                '/api/v1',

              routePrefix:
                '/configuration'
            },

            generation: {
              profile:
                'sbn-api-v2',

              definitionsDirectory:
                './definitions',

              output:
                './generated'
            }
          },
          {
            spaces:
              2
          }
        );

        const configuration =
          await loadForgeConfig({
            rootDirectory:
              temporaryDirectory
          });

        expect(
          configuration
        ).toMatchObject({
          source: {
            provider:
              'postgresql',

            schema:
              'simo_ai',

            host:
              'localhost',

            port:
              5432,

            database:
              'sbn_portal_test',

            user:
              'postgres'
          },

          project: {
            framework:
              'fastify',

            moduleRoot:
              'modules_ia',

            apiPrefix:
              '/api/v1',

            routePrefix:
              '/configuration'
          },

          generation: {
            profile:
              'sbn-api-v2',

            definitionsDirectory:
              './definitions',

            output:
              './generated'
          },

          configFileFound:
            true
        });
      }
    );

    test(
      'las opciones CLI tienen prioridad',
      () => {
        const configuration =
          mergeForgeConfiguration({
            defaults:
              DEFAULT_FORGE_CONFIG,

            fileConfig: {
              source: {
                schema:
                  'simo_ai',

                database:
                  'sbn_portal_test'
              },

              project: {
                moduleRoot:
                  'modules_ia',

                apiPrefix:
                  '/api',

                routePrefix:
                  '/ia'
              },

              generation: {
                profile:
                  'sbn-api-v2',

                output:
                  './output'
              }
            },

            cliOptions: {
              schema:
                'public',

              database:
                'sbn_cli',

              moduleRoot:
                'modules',

              apiPrefix:
                '/api/v2',

              routePrefix:
                '/configuration',

              output:
                './output-cli'
            }
          });

        expect(
          configuration
        ).toEqual({
          source: {
            provider:
              'postgresql',

            schema:
              'public',

            host:
              'localhost',

            port:
              5432,

            database:
              'sbn_cli',

            user:
              'postgres'
          },

          project: {
            framework:
              'fastify',

            moduleRoot:
              'modules',

            apiPrefix:
              '/api/v2',

            routePrefix:
              '/configuration'
          },

          generation: {
            profile:
              'sbn-api-v2',

            definitionsDirectory:
              './examples',

            output:
              './output-cli'
          }
        });
      }
    );

    test(
      'normaliza rutas y prefijos',
      () => {
        const configuration =
          mergeForgeConfiguration({
            fileConfig: {
              project: {
                moduleRoot:
                  './src\\modules_ia\\',

                apiPrefix:
                  'api/v1/',

                routePrefix:
                  'ia/'
              }
            }
          });

        expect(
          configuration.project.moduleRoot
        ).toBe(
          'src/modules_ia'
        );

        expect(
          configuration.project.apiPrefix
        ).toBe(
          '/api/v1'
        );

        expect(
          configuration.project.routePrefix
        ).toBe(
          '/ia'
        );
      }
    );

    test(
      'mantiene compatibilidad con configuración legacy',
      () => {
        const configuration =
          normalizeForgeConfig({
            framework:
              'fastify',

            moduleRoot:
              'modules_ia',

            apiPrefix:
              '/api',

            routePrefix:
              '/ia'
          });

        expect(
          configuration.project
        ).toEqual({
          framework:
            'fastify',

          moduleRoot:
            'modules_ia',

          apiPrefix:
            '/api',

          routePrefix:
            '/ia'
        });

        expect(
          configuration.source.provider
        ).toBe(
          'postgresql'
        );

        expect(
          configuration.generation.profile
        ).toBe(
          'sbn-api-v2'
        );
      }
    );
  }
);