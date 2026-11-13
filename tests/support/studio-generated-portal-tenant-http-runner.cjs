'use strict';
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const fastify = require('fastify');
const assert = require('node:assert/strict');
const jwt = require('@fastify/jwt');
const { generateIsolated } = require('../../studio/isolated-generation');
const { createPortalCrudSecurityBridge } = require('../../studio/portal-crud-security-bridge');
const meta = { defaultValue: null, identity: false, maxLength: null, precision: null, scale: null };
const ORG_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ORG_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const ID = '11111111-1111-4111-8111-111111111111';
const definition = {
  version: 1, name: 'portal_tenant_http',
  source: { type: 'postgresql', schema: 'product_hub', table: 'portal_tenant_http' },
  primaryKey: { name: 'portal_tenant_http_pkey', columns: ['id'] }, foreignKeys: [],
  fields: [
    { name: 'id', dataType: 'uuid', nullable: false, visible: true, editable: false, required: false, ...meta, defaultValue: 'gen_random_uuid()' },
    { name: 'organization_id', dataType: 'uuid', nullable: false, visible: true, editable: true, required: true, ...meta },
    { name: 'name', dataType: 'text', nullable: false, visible: true, editable: true, required: true, ...meta }
  ]
};
async function run() {
  const parent = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-portal-tenant-http-'));
  let app;
  try {
    const generated = await generateIsolated(definition, { tempRoot: parent });
    const routeArtifact = generated.artifacts.find(item => item.path.endsWith('.routes.js'));
    assert.ok(routeArtifact);
    const routeFile = path.join(generated.directory, routeArtifact.path);
    const routeSource = await fs.readFile(routeFile, 'utf8');
    const base = routeSource.match(/const base\s*=\s*'([^']+)'/)?.[1];
    assert.ok(base);
    const routes = require(routeFile);
    const queries = [];
    const database = { query: async (sql, params) => {
      queries.push({ sql, params });
      if (/\bINSERT\b/i.test(sql)) { return { rows: [{ id: ID, organization_id: ORG_A, name: 'created' }], rowCount: 1 }; }
      if (/\b(UPDATE|DELETE)\b/i.test(sql)) { return { rows: [{ id: ID, organization_id: ORG_A }], rowCount: 1 }; }
      return { rows: [{ id: ID, organization_id: ORG_A, name: 'ok' }], rowCount: 1 };
    } };
    const membershipQuery = async (sql, params) => {
      if (sql.includes('organization_users')) {
        return { rows: params[0] === ORG_A ? [{ organization_id: ORG_A, role: 'admin', status: 'active' }] : [] };
      }
      if (sql.includes('role_option_permissions')) {
        return { rows: [{ organization_id: ORG_A, role_code: 'admin', option_id: 50, allow: true,
          actions: { list: true, read: true, create: true, update: true, delete: true } }] };
      }
      throw new Error('Unexpected policy query');
    };
    const bridge = createPortalCrudSecurityBridge({
      verifyJWT: async request => request.jwtVerify(),
      query: membershipQuery, optionId: 50
    });
    app = fastify({ logger: false });
    await app.register(jwt, { secret: 'offline-portal-tenant-http-test-secret' });
    await app.register(routes, {
      database, tenantColumn: 'organization_id', requireTenantIsolation: true,
      requireCrudPermissions: true, portalSecurityBridge: bridge
    });
    await app.ready();
    const token = app.jwt.sign({ id: 7, organization_id: ORG_B });
    const operations = [
      { method: 'GET', url: base },
      { method: 'GET', url: base + '/' + ID },
      { method: 'POST', url: base, payload: { id: ID, name: 'created', organization_id: ORG_B } },
      { method: 'PATCH', url: base + '/' + ID, payload: { name: 'updated', organization_id: ORG_B } },
      { method: 'DELETE', url: base + '/' + ID }
    ];
    for (const operation of operations) {
      const before = queries.length;
      const missing = await app.inject(operation);
      assert.equal(missing.statusCode, 401, 'missing JWT ' + operation.method + ' ' + operation.url + ': ' + missing.body.slice(0, 350));
      assert.equal(queries.length, before);
      const foreign = await app.inject({ ...operation, headers: {
        authorization: 'Bearer ' + token, 'x-organization-id': ORG_B
      } });
      assert.equal(foreign.statusCode, 403, 'foreign ' + operation.method + ' ' + operation.url + ': ' + foreign.body.slice(0, 350));
      assert.equal(queries.length, before);
      const allowed = await app.inject({ ...operation, headers: {
        authorization: 'Bearer ' + token, 'x-organization-id': ORG_A
      } });
      assert.ok(allowed.statusCode < 400, 'allowed status: ' + allowed.statusCode + ' ' + allowed.body.slice(0, 300));
      const executed = queries.slice(before);
      assert.ok(executed.length > 0);
      for (const call of executed) {
        assert.ok(call.params.includes(ORG_A));
        assert.ok(!call.params.includes(ORG_B));
      }
    }
  } finally {
    if (app) { await app.close(); }
    await fs.rm(parent, { recursive: true, force: true });
  }
}
run().then(() => { process.stdout.write('PORTAL_TENANT_HTTP_OK\n'); }).catch(error => {
  process.stderr.write('PORTAL_TENANT_HTTP_FAILED: ' + error.message + '\n');
  process.exitCode = 1;
});
