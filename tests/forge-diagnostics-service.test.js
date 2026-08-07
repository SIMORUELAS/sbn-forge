'use strict';

const fs =
  require(
    'fs-extra'
  );

const os =
  require(
    'os'
  );

const path =
  require(
    'path'
  );

const ForgeDiagnosticsService =
  require(
    '../src/diagnostics/forge-diagnostics.service'
  );

describe(
  'ForgeDiagnosticsService',
  () => {
    let rootDirectory;

    beforeEach(
      async () => {
        rootDirectory =
          await fs.mkdtemp(
            path.join(
              os.tmpdir(),
              'sbn-forge-diagnostics-'
            )
          );

        await fs.ensureDir(
          path.join(
            rootDirectory,
            'examples'
          )
        );
      }
    );

    afterEach(
      async () => {
        await fs.remove(
          rootDirectory
        );
      }
    );

    test(
      'reporta un entorno saludable',
      async () => {
        const postgreSqlTester = {
          test:
            jest.fn()
              .mockResolvedValue({
                connected:
                  true,

                databaseAccessible:
                  true,

                schemaExists:
                  true,

                informationSchemaAccessible:
                  true
              })
        };

        const service =
          new ForgeDiagnosticsService({
            rootDirectory,

            postgreSqlTester
          });

        const result =
          await service.run({
            configuration: {
              configFileFound:
                true,

              source: {
                provider:
                  'postgresql',

                host:
                  'localhost',

                port:
                  5432,

                database:
                  'sbn_portal_test',

                schema:
                  'simo_ai',

                user:
                  'postgres'
              },

              project: {
                framework:
                  'fastify',

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

                definitionsDirectory:
                  './examples',

                output:
                  './output'
              }
            },

            password:
              'test-password'
          });

        expect(
          result.healthy
        ).toBe(
          true
        );

        expect(
          postgreSqlTester.test
        ).toHaveBeenCalledTimes(
          1
        );

        expect(
          result.checks.every(
            check =>
              check.success
          )
        ).toBe(
          true
        );
      }
    );

    test(
      'reporta fallo cuando PostgreSQL rechaza la conexión',
      async () => {
        const postgreSqlTester = {
          test:
            jest.fn()
              .mockRejectedValue(
                new Error(
                  'authentication failed'
                )
              )
        };

        const service =
          new ForgeDiagnosticsService({
            rootDirectory,

            postgreSqlTester
          });

        const result =
          await service.run({
            configuration: {
              configFileFound:
                true,

              source: {
                provider:
                  'postgresql',

                host:
                  'localhost',

                port:
                  5432,

                database:
                  'sbn_portal_test',

                schema:
                  'simo_ai',

                user:
                  'postgres'
              },

              project: {
                framework:
                  'fastify'
              },

              generation: {
                profile:
                  'sbn-api-v2',

                definitionsDirectory:
                  './examples',

                output:
                  './output'
              }
            },

            password:
              'wrong-password'
          });

        expect(
          result.healthy
        ).toBe(
          false
        );

        expect(
          result.checks
        ).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              code:
                'postgresqlConnected',

              success:
                false
            })
          ])
        );
      }
    );
  }
);