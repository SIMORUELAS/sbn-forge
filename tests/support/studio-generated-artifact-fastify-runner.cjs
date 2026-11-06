'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const fastify = require('fastify');
const jwt = require('@fastify/jwt');
const { generateIsolated } = require('../../studio/isolated-generation');

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

async function run() {
  const parent = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-artifact-fastify-'));
  let app;
  const loaded = [];
  try {
    const generated = await generateIsolated(definition, { tempRoot: parent });
    const artifact = generated.artifacts.find(item => item.path.endsWith('.routes.js'));
    assert.ok(artifact, 'generated routes artifact required');
    const routeFile = path.join(generated.directory, artifact.path);
    const routeSource = await fs.readFile(routeFile, 'utf8');
    const routeBase = routeSource.match(/const base\s*=\s*'([^']+)'/)?.[1];
    assert.ok(routeBase, 'generated route base required');
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
    let missingJwtRejected = 0;
    let unauthorizedRejected = 0;
    for (const operation of operations) {
      const missing = await app.inject(operation);
      assert.equal(missing.statusCode, 401, operation.method + ' must reject missing JWT');
      missingJwtRejected++;
      const denied = await app.inject({
        ...operation, headers: { authorization: 'Bearer ' + token }
      });
      const safeFailure = denied.statusCode === 400
        ? ' (validation: ' + String(denied.json()?.message || 'unspecified').slice(0, 250) + ')'
        : '';
      assert.equal(denied.statusCode, 403,
        operation.method + ' must reject unauthorized CRUD' + safeFailure);
      unauthorizedRejected++;
    }
    assert.equal(queryCount, 0, 'unauthorized operations must never access database');
    return { operations: operations.length, missingJwtRejected, unauthorizedRejected, queryCount };
  } finally {
    if (app) { await app.close(); }
    for (const file of loaded) { delete require.cache[file]; }
    await fs.rm(parent, { recursive: true, force: true });
  }
}

run().then(report => {
  process.stdout.write(JSON.stringify(report) + '\n');
}).catch(error => {
  process.stderr.write('FASTIFY_ARTIFACT_AUTH_INTEGRATION_FAILED: ' + error.message + '\n');
  process.exitCode = 1;
});
