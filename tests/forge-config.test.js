'use strict';

const path = require('path');
const fs = require('fs-extra');
const os = require('os');

const {
  DEFAULT_FORGE_CONFIG,
  loadForgeConfig,
  mergeForgeConfiguration
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
          configuration.framework
        ).toBe(
          'fastify'
        );

        expect(
          configuration.moduleRoot
        ).toBe(
          'modules'
        );

        expect(
          configuration.apiPrefix
        ).toBe(
          '/api'
        );

        expect(
          configuration.routePrefix
        ).toBe(
          '/ia'
        );

        expect(
          configuration.configFileFound
        ).toBe(
          false
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
            framework:
              'fastify',

            moduleRoot:
              'modules_ia',

            apiPrefix:
              '/api/v1',

            routePrefix:
              '/configuration'
          },
          {
            spaces: 2
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
          framework:
            'fastify',

          moduleRoot:
            'modules_ia',

          apiPrefix:
            '/api/v1',

          routePrefix:
            '/configuration',

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
              moduleRoot:
                'modules_ia',

              apiPrefix:
                '/api',

              routePrefix:
                '/ia'
            },

            cliOptions: {
              moduleRoot:
                'modules',

              apiPrefix:
                '/api/v2',

              routePrefix:
                '/configuration'
            }
          });

        expect(
          configuration
        ).toEqual({
          framework:
            'fastify',

          moduleRoot:
            'modules',

          apiPrefix:
            '/api/v2',

          routePrefix:
            '/configuration'
        });
      }
    );

    test(
      'normaliza rutas y prefijos',
      () => {
        const configuration =
          mergeForgeConfiguration({
            fileConfig: {
              moduleRoot:
                './src\\modules_ia\\',

              apiPrefix:
                'api/v1/',

              routePrefix:
                'ia/'
            }
          });

        expect(
          configuration.moduleRoot
        ).toBe(
          'src/modules_ia'
        );

        expect(
          configuration.apiPrefix
        ).toBe(
          '/api/v1'
        );

        expect(
          configuration.routePrefix
        ).toBe(
          '/ia'
        );
      }
    );
  }
);