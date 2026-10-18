'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const Handlebars = require('handlebars');
const { Client } = require('pg');

const run = process.env.FORGE_PG_INTEGRATION === '1' &&
  process.env.FORGE_PG_CONCURRENCY === '1' ? test : test.skip;

function configFromFile(file) {
  if (!file) {
    throw new Error('FORGE_PG_ENV_FILE es obligatorio');
  }
  const config = {};
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*(DB_HOST|DB_PORT|DB_USER|DB_PASSWORD)\s*=\s*(.*)\s*$/);
    if (match) {
      let value = match[2].trim();
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      config[match[1]] = value;
    }
  }
  return {
    host: config.DB_HOST,
    port: Number(config.DB_PORT || 5432),
    user: config.DB_USER,
    password: config.DB_PASSWORD,
    database: 'sbnportal_forge_test',
    connectionTimeoutMillis: 5000,
    query_timeout: 10000
  };
}

function repository(table, client) {
  const source = fs.readFileSync(
    path.join(__dirname, '../src/templates/backend/repository.hbs'), 'utf8'
  );
  const rendered = Handlebars.compile(source)({
    schema: 'public',
    table,
    database: { schema: 'public', table },
    primaryKeyInfo: {
      columns: [
        { name: 'agent_id', generated: false },
        { name: 'role_id', generated: false }
      ]
    },
    columns: [
      { name: 'agent_id' }, { name: 'role_id' }, { name: 'version_no' }
    ],
    writableColumns: [],
    listFilters: [{ name: 'agent_id' }],
    columnMap: {
      created_by: {}, created_from: {}, updated_by: {}, updated_from: {},
      updated_at: {}, deleted_by: {}
    },
    capabilities: { softDelete: true, optimisticLock: true }
  });
  const module = { exports: {} };
  vm.runInNewContext(rendered, { module, exports: module.exports });
  module.exports.configure(client);
  return module.exports;
}

describe('generated repository: real PostgreSQL concurrency', () => {
  run('two connections preserve optimistic locking and idempotent reactivation', async () => {
    const config = configFromFile(process.env.FORGE_PG_ENV_FILE);
    const table = 'forge_concurrency_' + crypto.randomUUID().replace(/-/g, '');
    const clients = [new Client(config), new Client(config)];
    let created = false;
    const connected = [];
    try {
      for (const client of clients) {
        await client.connect();
        connected.push(client);
        const identity = await client.query('SELECT current_database() AS name');
        if (identity.rows[0].name !== 'sbnportal_forge_test') {
          throw new Error('DATABASE_NOT_ALLOWED');
        }
      }
      // This table is intentionally shared between sessions, unlike a TEMP table.
      // It is unique to this run and is dropped in finally.
      await clients[0].query(
        'CREATE TABLE public.' + table + ' (' +
        'agent_id uuid NOT NULL, role_id smallint NOT NULL, ' +
        'created_by text, created_from text, updated_by text, ' +
        'updated_from text, updated_at timestamptz, ' +
        'deleted_by text, deleted_at timestamptz, ' +
        'version_no integer NOT NULL DEFAULT 1, ' +
        'PRIMARY KEY (agent_id, role_id))'
      );
      created = true;
      const [first, second] = clients.map(client => repository(table, client));
      const key = { agent_id: '11111111-1111-4111-8111-111111111111', role_id: 3 };
      expect((await first.create(key)).version_no).toBe(1);

      const updates = await Promise.all([
        first.update(key, { expected_version_no: 1 }, { userId: 'first' }),
        second.update(key, { expected_version_no: 1 }, { userId: 'second' })
      ]);
      expect(updates.filter(Boolean)).toHaveLength(1);
      expect((await first.getById(key)).version_no).toBe(2);

      expect(await first.remove(key)).toBe(true);
      const reactivated = await Promise.all([
        first.create(key, { userId: 'first' }),
        second.create(key, { userId: 'second' })
      ]);
      expect(reactivated.every(row => row && row.deleted_at === null)).toBe(true);
      expect(reactivated.map(row => row.version_no)).toEqual([4, 4]);
      const repeated = await second.create(key);
      expect(repeated.version_no).toBe(4);
      const result = await clients[0].query(
        'SELECT count(*)::integer AS count FROM public.' + table
      );
      expect(result.rows[0].count).toBe(1);
    } finally {
      if (created) {
        try {
          await clients[0].query('DROP TABLE public.' + table);
        } catch (error) {
          throw new Error('No se pudo limpiar tabla de prueba ' + table + ': ' + error.message);
        } finally {
          await Promise.all(connected.map(client => client.end()));
        }
      } else {
        await Promise.all(connected.map(client => client.end()));
      }
    }
  }, 30000);
});
