'use strict';

const PostgreSqlConfigTester =
  require(
    '../src/config/postgresql-config-tester'
  );

describe(
  'PostgreSqlConfigTester',
  () => {
    test(
      'valida conexión, base, schema e information_schema',
      async () => {
        const connect =
          jest.fn()
            .mockResolvedValue(
              undefined
            );

        const end =
          jest.fn()
            .mockResolvedValue(
              undefined
            );

        const query =
          jest.fn()
            .mockResolvedValueOnce({
              rows: [
                {
                  database:
                    'sbn_portal_test'
                }
              ]
            })
            .mockResolvedValueOnce({
              rows: [
                {
                  exists:
                    true
                }
              ]
            })
            .mockResolvedValueOnce({
              rows: []
            });

        const FakeClient =
          jest.fn()
            .mockImplementation(
              () => ({
                connect,
                query,
                end
              })
            );

        const tester =
          new PostgreSqlConfigTester({
            Client:
              FakeClient
          });

        const result =
          await tester.test({
            host:
              'localhost',

            port:
              5432,

            database:
              'sbn_portal_test',

            user:
              'postgres',

            password:
              'test-password',

            schema:
              'simo_ai'
          });

        expect(
          FakeClient
        ).toHaveBeenCalledWith({
          host:
            'localhost',

          port:
            5432,

          database:
            'sbn_portal_test',

          user:
            'postgres',

          password:
            'test-password'
        });

        expect(
          connect
        ).toHaveBeenCalledTimes(
          1
        );

        expect(
          result
        ).toEqual({
          connected:
            true,

          databaseAccessible:
            true,

          schemaExists:
            true,

          informationSchemaAccessible:
            true
        });

        expect(
          end
        ).toHaveBeenCalledTimes(
          1
        );
      }
    );

    test(
      'si la conexión falla propaga el error y cierra el cliente',
      async () => {
        const connect =
          jest.fn()
            .mockRejectedValue(
              new Error(
                'authentication failed'
              )
            );

        const query =
          jest.fn();

        const end =
          jest.fn()
            .mockResolvedValue(
              undefined
            );

        const FakeClient =
          jest.fn()
            .mockImplementation(
              () => ({
                connect,
                query,
                end
              })
            );

        const tester =
          new PostgreSqlConfigTester({
            Client:
              FakeClient
          });

        await expect(
          tester.test({
            host:
              'localhost',

            port:
              5432,

            database:
              'sbn_portal_test',

            user:
              'postgres',

            password:
              'wrong-password',

            schema:
              'simo_ai'
          })
        ).rejects.toThrow(
          'authentication failed'
        );

        expect(
          query
        ).not.toHaveBeenCalled();

        expect(
          end
        ).toHaveBeenCalledTimes(
          1
        );
      }
    );
  }
);