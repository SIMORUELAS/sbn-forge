'use strict';
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { Client } = require('pg');
const { generateIsolated } = require('../studio/isolated-generation');

const enabled = process.env.SBN_FORGE_RUN_TENANT_PG_INTEGRATION === '1';
const connectionString = process.env.SBN_FORGE_TENANT_TEST_DATABASE_URL;
const describePg = enabled && connectionString ? describe : describe.skip;
const tenantA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const tenantB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const recordId = '11111111-1111-4111-8111-111111111111';
const metadata = { defaultValue: null, identity: false, maxLength: null, precision: null, scale: null };

describePg('isolated Studio artifact repository against dedicated PostgreSQL', () => {
  let client;
  let parent;
  let schema;
  let repository;
  let repositoryFile;
  let schemaCreated = false;

  beforeAll(async () => {
    let requested;
    try {
      requested = new URL(connectionString);
      if (!['postgres:', 'postgresql:'].includes(requested.protocol) ||
          !/(^test$|_test$|^test_)/i.test(decodeURIComponent(requested.pathname.slice(1)))) {
        throw new Error('TENANT_PG_TEST_DATABASE_REQUIRED');
      }
    } catch {
      throw new Error('TENANT_PG_TEST_DATABASE_REQUIRED');
    }
    client = new Client({ connectionString, connectionTimeoutMillis: 5000 });
    await client.connect();
    const result = await client.query('SELECT current_database() AS name');
    if (!/(^test$|_test$|^test_)/i.test(result.rows[0].name)) {
      throw new Error('TENANT_PG_TEST_DATABASE_REQUIRED');
    }
    schema = 'forge_artifact_test_' + process.pid + '_' + Math.random().toString(16).slice(2, 10);
    const definition = {
      version: 1, name: 'artifact_pg_test',
      source: { type: 'postgresql', schema, table: 'records' },
      primaryKey: { name: 'records_pkey', columns: ['id'] },
      foreignKeys: [],
      fields: [
        { name: 'id', dataType: 'uuid', nullable: false, visible: true, editable: false, required: false, ...metadata, defaultValue: 'gen_random_uuid()' },
        { name: 'organization_id', dataType: 'uuid', nullable: false, visible: true, editable: true, required: true, ...metadata },
        { name: 'name', dataType: 'text', nullable: false, visible: true, editable: true, required: true, ...metadata }
      ]
    };
    parent = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-artifact-pg-'));
    const run = await generateIsolated(definition, { tempRoot: parent });
    repositoryFile = path.join(run.directory, run.artifacts.find(item => item.path.endsWith('.repository.js')).path);
    repository = require(repositoryFile);
    await client.query('CREATE SCHEMA "' + schema + '"');
    schemaCreated = true;
    await client.query('CREATE TABLE "' + schema + '".records (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL, name text NOT NULL)');
    repository.configure(client, { tenantColumn: 'organization_id' });
  }, 20000);

  afterAll(async () => {
    try {
      if (client && schemaCreated) {
        await client.query('DROP SCHEMA "' + schema + '" CASCADE');
      }
    } finally {
      if (client) {
        await client.end();
      }
      if (repositoryFile) {
        delete require.cache[repositoryFile];
      }
      if (parent) {
        await fs.rm(parent, { recursive: true, force: true });
      }
    }
  });

  test('generated artifact enforces tenant isolation on real PostgreSQL CRUD', async () => {
    const created = await repository.create({ name: 'owned by A', organization_id: tenantB }, { organizationId: tenantA });
    expect(created.id).toBeTruthy();
    const createdId = created.id;
    expect(created.organization_id).toBe(tenantA);
    expect((await repository.list({}, { organizationId: tenantB })).data).toHaveLength(0);
    expect(await repository.getById(createdId, { organizationId: tenantB })).toBeNull();
    expect(await repository.update(createdId, { name: 'tampered', organization_id: tenantB }, { organizationId: tenantB })).toBeNull();
    expect(await repository.remove(createdId, { organizationId: tenantB })).toBe(false);
    expect((await repository.getById(createdId, { organizationId: tenantA })).name).toBe('owned by A');
  });

  test('generated artifact rejects missing tenant context', async () => {
    await expect(repository.list({})).rejects.toMatchObject({ code: 'TENANT_SCOPE_REQUIRED' });
    await expect(repository.getById(recordId)).rejects.toMatchObject({ code: 'TENANT_SCOPE_REQUIRED' });
  });
});
