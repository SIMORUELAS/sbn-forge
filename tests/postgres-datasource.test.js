'use strict';

const PostgresDatasource = require(
  '../src/datasources/postgresql/postgres.datasource'
);

describe('PostgresDatasource', () => {
  test('delega consultas al Pool de PostgreSQL', async () => {
    const pool = {
      query: jest.fn().mockResolvedValue({
        rows: [{ id: 1 }]
      }),
      end: jest.fn().mockResolvedValue()
    };

    const datasource = new PostgresDatasource(
      {},
      { pool }
    );

    const result = await datasource.query(
      'SELECT * FROM users WHERE id = $1',
      [1]
    );

    expect(pool.query).toHaveBeenCalledWith(
      'SELECT * FROM users WHERE id = $1',
      [1]
    );

    expect(result.rows).toEqual([{ id: 1 }]);
  });

  test('cierra el pool de conexiones', async () => {
    const pool = {
      query: jest.fn(),
      end: jest.fn().mockResolvedValue()
    };

    const datasource = new PostgresDatasource(
      {},
      { pool }
    );

    await datasource.close();

    expect(pool.end).toHaveBeenCalledTimes(1);
  });
});