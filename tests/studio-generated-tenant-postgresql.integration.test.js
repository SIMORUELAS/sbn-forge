'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Handlebars = require('handlebars');
const { Client } = require('pg');

const enabled = process.env.SBN_FORGE_RUN_TENANT_PG_INTEGRATION === '1';
const connectionString = process.env.SBN_FORGE_TENANT_TEST_DATABASE_URL;
const describePg = enabled && connectionString ? describe : describe.skip;
const tenantA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const tenantB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const template = fs.readFileSync(path.join(__dirname, '../src/templates/backend/repository.hbs'), 'utf8');

describePg('generated tenant isolation against disposable PostgreSQL schema', () => {
  let client;
  let schema;
  let repository;
  const key = { record_id: '11111111-1111-4111-8111-111111111111', part_id: 1 };

  beforeAll(async () => {
    client = new Client({ connectionString, connectionTimeoutMillis: 5000 });
    await client.connect();
    const db = await client.query('SELECT current_database() AS name');
    if (!/(^test$|_test$|^test_)/i.test(db.rows[0].name)) {
      throw new Error('TENANT_PG_TEST_DATABASE_REQUIRED: use a dedicated database ending in _test');
    }
    schema = 'forge_tenant_test_' + process.pid + '_' + Math.random().toString(16).slice(2, 10);
    await client.query('CREATE SCHEMA "' + schema + '"');
    await client.query('CREATE TABLE "' + schema + '".records (record_id uuid NOT NULL, part_id integer NOT NULL, organization_id uuid NOT NULL, label text, deleted_at timestamptz, PRIMARY KEY (record_id, part_id))');
    const source = Handlebars.compile(template)({
      schema, table: 'records', database: { schema, table: 'records' },
      primaryKeyInfo: { columns: [{ name: 'record_id', generated: false }, { name: 'part_id', generated: false }] },
      columns: ['record_id', 'part_id', 'organization_id', 'label', 'deleted_at'].map(name => ({ name })),
      writableColumns: ['record_id', 'part_id', 'organization_id', 'label'].map(name => ({ name })),
      listFilters: [], columnMap: {}, capabilities: { softDelete: true, optimisticLock: false }
    });
    const module = { exports: {} };
    vm.runInNewContext(source, { module, exports: module.exports });
    repository = module.exports;
    repository.configure(client, { tenantColumn: 'organization_id' });
  }, 15000);

  afterAll(async () => {
    try {
      if (client && schema) {
        await client.query('DROP SCHEMA IF EXISTS "' + schema + '" CASCADE');
      }
    } finally {
      if (client) {
        await client.end();
      }
    }
  });

  test('organization B cannot read, update or delete A record', async () => {
    const created = await repository.create({ ...key, organization_id: tenantB, label: 'A' }, { organizationId: tenantA });
    expect(created.organization_id).toBe(tenantA);
    expect((await repository.list({}, { organizationId: tenantB })).data).toHaveLength(0);
    expect(await repository.getById(key, { organizationId: tenantB })).toBeNull();
    expect(await repository.update(key, { label: 'B', organization_id: tenantB }, { organizationId: tenantB })).toBeNull();
    expect(await repository.remove(key, { organizationId: tenantB })).toBe(false);
    expect((await repository.getById(key, { organizationId: tenantA })).label).toBe('A');
  });

  test('cross-tenant reactivation fails closed without altering A record', async () => {
    await repository.remove(key, { organizationId: tenantA });
    await expect(repository.create({ ...key, label: 'B' }, { organizationId: tenantB }))
      .rejects.toMatchObject({ code: 'TENANT_CONFLICT', statusCode: 409 });
    const result = await client.query('SELECT organization_id, deleted_at FROM "' + schema + '".records WHERE record_id = $1 AND part_id = $2', [key.record_id, key.part_id]);
    expect(result.rows[0].organization_id).toBe(tenantA);
    expect(result.rows[0].deleted_at).not.toBeNull();
    await repository.create({ ...key, label: 'restored' }, { organizationId: tenantA });
    expect((await repository.getById(key, { organizationId: tenantA })).label).toBe('A');
  });

  test('missing tenant fails closed', async () => {
    await expect(repository.list({})).rejects.toMatchObject({ code: 'TENANT_SCOPE_REQUIRED' });
  });
});
