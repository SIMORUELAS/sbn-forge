'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const Handlebars = require('handlebars');
const { Client } = require('pg');

const enabled = process.env.FORGE_PG_INTEGRATION === '1';
const testReal = enabled ? test : test.skip;

function readConfig(file) {
  const values = {};
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*(DB_HOST|DB_PORT|DB_USER|DB_PASSWORD)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    values[match[1]] = value;
  }
  return values;
}

function generateRepository() {
  const source = fs.readFileSync(
    path.join(__dirname, '../src/templates/backend/repository.hbs'), 'utf8'
  );
  const rendered = Handlebars.compile(source)({
    schema: 'pg_temp',
    table: 'forge_reactivation_integration',
    database: { schema: 'pg_temp', table: 'forge_reactivation_integration' },
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
  return module.exports;
}

describe('generated repository: PostgreSQL transaction integration', () => {
  testReal('create, filter, update, soft-delete, reactivate, idempotency, rollback', async () => {
    const file = process.env.FORGE_PG_ENV_FILE;
    if (!file) throw new Error('FORGE_PG_ENV_FILE es obligatorio');
    const config = readConfig(file);
    const client = new Client({
      host: config.DB_HOST,
      port: Number(config.DB_PORT || 5432),
      user: config.DB_USER,
      password: config.DB_PASSWORD,
      database: 'sbnportal_forge_test',
      connectionTimeoutMillis: 5000
    });
    let connected = false;
    let inTransaction = false;
    try {
      await client.connect();
      connected = true;
      const identity = await client.query('SELECT current_database() AS name');
      if (identity.rows[0].name !== 'sbnportal_forge_test') {
        throw new Error('DATABASE_NOT_ALLOWED');
      }
      await client.query('BEGIN');
      inTransaction = true;
      await client.query(`
        CREATE TEMP TABLE forge_reactivation_integration (
          agent_id uuid NOT NULL,
          role_id smallint NOT NULL,
          created_by text,
          created_from text,
          updated_by text,
          updated_from text,
          updated_at timestamptz,
          deleted_by text,
          deleted_at timestamptz,
          version_no integer NOT NULL DEFAULT 1,
          PRIMARY KEY (agent_id, role_id)
        ) ON COMMIT DROP
      `);
      const repo = generateRepository();
      repo.configure(client);
      const key = {
        agent_id: '11111111-1111-4111-8111-111111111111',
        role_id: 3
      };
      const created = await repo.create(key, { userId: 'forge-test', source: 'integration' });
      expect(created.agent_id).toBe(key.agent_id);
      expect(created.role_id).toBe(key.role_id);
      expect(created.version_no).toBe(1);
      const filtered = await repo.list({ agent_id: key.agent_id, limit: 10, offset: 0 });
      expect(filtered.data).toHaveLength(1);
      const updated = await repo.update(key, { expected_version_no: 1 }, {
        userId: 'forge-test', source: 'integration'
      });
      expect(updated.version_no).toBe(2);
      expect(await repo.remove(key, { userId: 'forge-test' })).toBe(true);
      expect(await repo.getById(key)).toBeNull();
      const reactivated = await repo.create(key, {
        userId: 'forge-test', source: 'integration'
      });
      expect(reactivated.deleted_at).toBeNull();
      expect(reactivated.deleted_by).toBeNull();
      expect(reactivated.version_no).toBe(4);
      const repeated = await repo.create(key, {
        userId: 'forge-test', source: 'integration'
      });
      expect(repeated.version_no).toBe(4);
      const count = await client.query(
        'SELECT count(*)::integer AS count FROM pg_temp.forge_reactivation_integration'
      );
      expect(count.rows[0].count).toBe(1);
    } finally {
      if (connected && inTransaction) {
        try { await client.query('ROLLBACK'); } catch (_) { /* connection may have dropped */ }
      }
      if (connected) await client.end();
    }
  }, 20000);
});
