'use strict';

const {
  resolvePostgresqlOptions
} = require(
  '../src/cli/commands/inspect-postgresql.command'
);

describe(
  'Inspect PostgreSQL Command',
  () => {
    test(
      'resuelve la conexion desde forge config y SBN_POSTGRES_PASSWORD',
      () => {
        const options = {};

        const configuration = {
          source: {
            host: 'config-host',
            port: 5433,
            database: 'config-database',
            user: 'config-user'
          }
        };

        const environment = {
          SBN_POSTGRES_PASSWORD:
            'config-password'
        };

        const result =
          resolvePostgresqlOptions(
            options,
            configuration,
            environment
          );

        expect(
          result
        ).toEqual({
          host: 'config-host',
          port: 5433,
          database: 'config-database',
          user: 'config-user',
          password: 'config-password',
          ssl: false
        });
      }
    );

    test(
      'da prioridad a las opciones CLI',
      () => {
        const options = {
          host: 'cli-host',
          port: '6543',
          database: 'cli-database',
          user: 'cli-user',
          password: 'cli-password'
        };

        const configuration = {
          source: {
            host: 'config-host',
            port: 5433,
            database: 'config-database',
            user: 'config-user'
          }
        };

        const environment = {
          SBN_POSTGRES_PASSWORD:
            'environment-password',
          SBN_FORGE_DB_HOST:
            'environment-host',
          SBN_FORGE_DB_PORT:
            '7777',
          SBN_FORGE_DB_NAME:
            'environment-database',
          SBN_FORGE_DB_USER:
            'environment-user'
        };

        const result =
          resolvePostgresqlOptions(
            options,
            configuration,
            environment
          );

        expect(
          result
        ).toEqual({
          host: 'cli-host',
          port: 6543,
          database: 'cli-database',
          user: 'cli-user',
          password: 'cli-password',
          ssl: false
        });
      }
    );

    test(
      'mantiene compatibilidad con variables SBN_FORGE_DB',
      () => {
        const options = {};

        const configuration = {
          source: {}
        };

        const environment = {
          SBN_FORGE_DB_HOST:
            'environment-host',
          SBN_FORGE_DB_PORT:
            '6544',
          SBN_FORGE_DB_NAME:
            'environment-database',
          SBN_FORGE_DB_USER:
            'environment-user',
          SBN_FORGE_DB_PASSWORD:
            'environment-password'
        };

        const result =
          resolvePostgresqlOptions(
            options,
            configuration,
            environment
          );

        expect(
          result
        ).toEqual({
          host: 'environment-host',
          port: 6544,
          database: 'environment-database',
          user: 'environment-user',
          password: 'environment-password',
          ssl: false
        });
      }
    );
  }
);