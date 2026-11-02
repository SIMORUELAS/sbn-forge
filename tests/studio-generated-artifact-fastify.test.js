'use strict';
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const fastify = require('fastify');
const jwt = require('@fastify/jwt');
const { generateIsolated } = require('../studio/isolated-generation');

const meta = { defaultValue: null, identity: false, maxLength: null, precision: null, scale: null };
const definition = {
  version: 1, name: 'artifact_auth_test',
  source: { type: 'postgresql', schema: 'product_hub', table: 'artifact_auth_test' },
  primaryKey: { name: 'artifact_auth_test_pkey', columns: ['id'] }, foreignKeys: [],
  fields: [
    { name: 'id', dataType: 'uuid', nullable: false, visible: true, editable: false, required: false, ...meta, defaultValue: 'gen_random_uuid()' },
    { name: 'organization_id', dataType: 'uuid', nullable: false, visible: true, editable: true, required: true, ...meta },
    { name: 'name', dataType: 'text', nullable: false, visible: true, editable: true, required: true, ...meta }
  ]
};

test('real generated Fastify routes reject missing JWT and unauthorized CRUD before database access', async () => {
  const parent = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-artifact-fastify-'));
  let app;
  const loaded = [];
  try {
    const run = await generateIsolated(definition, { tempRoot: parent });
    const routeFile = path.join(run.directory, run.artifacts.find(item => item.path.endsWith('.routes.js')).path);
    const routeSource = await fs.readFile(routeFile, 'utf8');
    const routeBase = routeSource.split('const base')[1]?.split("'")[1];
    expect(routeBase).toBeTruthy();
    const routes = require(routeFile);
    loaded.push(routeFile);
    app = fastify({ logger: false });
    await app.register(jwt, { secret: 'forge-artifact-local-test-secret' });
    let queryCount = 0;
    await app.register(routes, {
      database: { async query() { queryCount++; return { rows: [], rowCount: 0 }; } },
      tenantColumn: 'organization_id',
      requireTenantIsolation: true,
      requireCrudPermissions: true,
      authorizeOperation: async () => false
    });
    await app.ready();
    const recordId = '11111111-1111-4111-8111-111111111111';
    const validBody = { name: 'x', organization_id: '22222222-2222-4222-8222-222222222222' };
    const operations = [
      { method: 'GET', url: routeBase },
      { method: 'GET', url: routeBase + '/' + recordId },
      { method: 'POST', url: routeBase, payload: validBody },
      { method: 'PATCH', url: routeBase + '/' + recordId, payload: { name: 'x' } },
      { method: 'DELETE', url: routeBase + '/' + recordId }
    ];
    const token = app.jwt.sign({ id: 'user-a', organization_id: 'org-a' });
    for (const operation of operations) {
      const missing = await app.inject(operation);
      expect(missing.statusCode).toBe(401);
      const denied = await app.inject({
        ...operation, headers: { authorization: 'Bearer ' + token }
      });
      expect(denied.statusCode).toBe(403);
    }
    expect(queryCount).toBe(0);
  } finally {
    if (app) {
      await app.close();
    }
    for (const file of loaded) {
      delete require.cache[file];
    }
    await fs.rm(parent, { recursive: true, force: true });
  }
});
