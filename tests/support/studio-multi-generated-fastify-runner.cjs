'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const fastify = require('fastify');
const jwt = require('@fastify/jwt');
const { generateMultiIsolated } = require('../../studio/multi-isolated-generation');

const col = (name, type = 'uuid') => ({ name, type, nullable: false,
  defaultValue: null, maxLength: null, precision: null, scale: null,
  identity: false, identityGeneration: null });
const definition = {
  kind: 'studio.multitable.preview', version: 1, name: 'catalog', mode: 'READ_ONLY_PREVIEW',
  source: { profile: 'pg_test', schema: 'product_hub' }, primaryTable: 'products',
  tables: [
    { name: 'products', columns: [col('id'), col('organization_id'), col('name', 'text')], primaryKey: ['id'],
      settings: { resourceEnabled: true, formEnabled: false, permissions: ['read'] } },
    { name: 'items', columns: [col('id'), col('organization_id'), col('product_id')], primaryKey: ['id'],
      settings: { resourceEnabled: true, formEnabled: false, permissions: ['read'] } }
  ],
  relations: [{ fromTable: 'items', fromColumn: 'product_id', toTable: 'products', toColumn: 'id' }],
  foreignKeyGroups: [{ name: 'fk_items_products', fromTable: 'items', toTable: 'products',
    columns: [{ fromColumn: 'product_id', toColumn: 'id' }] }]
};
const id = '11111111-1111-4111-8111-111111111111';
const operations = (base, table) => [
  { method: 'GET', url: base, operation: 'list' },
  { method: 'GET', url: base + '/' + id, operation: 'getById' },
  { method: 'POST', url: base, operation: 'create',
    payload: { id, organization_id: id, ...(table === 'products' ? { name: 'test' } : { product_id: id }) } },
  { method: 'PATCH', url: base + '/' + id, operation: 'update',
    payload: table === 'products' ? { name: 'updated' } : { product_id: id } },
  { method: 'DELETE', url: base + '/' + id, operation: 'remove' }
];
async function run() {
  const parent = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-multi-http-'));
  const cached = [];
  let app;
  try {
    const generated = await generateMultiIsolated(definition, { tempRoot: parent });
    assert.equal(generated.totals.written, 14);
    app = fastify({ logger: false });
    await app.register(jwt, { secret: 'forge-multitable-test-only-secret' });
    let queries = 0;
    let allow = false;
    const statements = [];
    const database = { async query(sql, values) {
      queries++;
      statements.push({ sql: sql.replace(/\s+/g, ' ').trim(), values });
      return { rows: [{ id, organization_id: id }], rowCount: 1 };
    } };
    const routes = [];
    for (const table of generated.orderedTables) {
      const routeArtifact = generated.artifacts.find(item =>
        item.table === table && item.path.endsWith('.routes.js'));
      assert.ok(routeArtifact);
      const filename = path.join(generated.directory, routeArtifact.path);
      const source = await fs.readFile(filename, 'utf8');
      const base = source.match(/const base\s*=\s*'([^']+)'/)?.[1];
      assert.ok(base, 'missing route base for ' + table);
      const plugin = require(filename);
      cached.push(filename);
      await app.register(plugin, { database, tenantColumn: 'organization_id',
        requireTenantIsolation: true, requireCrudPermissions: true, authorizeOperation: async () => allow });
      routes.push(...operations(base, table).map(operation => ({ ...operation, table })));
    }
    await app.ready();
    const token = app.jwt.sign({ id: 'test-user', organization_id: id });
    let missingJwtRejected = 0;
    let unauthorizedRejected = 0;
    for (const operation of routes) {
      const anonymous = await app.inject(operation);
      assert.equal(anonymous.statusCode, 401, operation.table + ' ' + operation.operation + ' JWT');
      missingJwtRejected++;
      const denied = await app.inject({ ...operation,
        headers: { authorization: 'Bearer ' + token } });
      assert.equal(denied.statusCode, 403, operation.table + ' ' + operation.operation + ' permissions');
      unauthorizedRejected++;
    }
    assert.equal(queries, 0, 'denied requests must never access the database');
    const deniedQueries = queries;
    if (process.argv.includes('--authorized')) {
      allow = true;
      let authorized = 0;
      for (const operation of routes) {
        const before = statements.length;
        const response = await app.inject({ ...operation,
          headers: { authorization: 'Bearer ' + token } });
        const expected = operation.method === 'POST' ? 201 : operation.method === 'DELETE' ? 204 : 200;
        assert.equal(response.statusCode, expected, operation.table + ' ' + operation.operation + ': ' + response.body);
        assert.equal(statements.length, before + 1);
        const { sql, values } = statements[before];
        assert.ok(sql.includes('product_hub.' + operation.table));
        assert.ok(!sql.includes(id), 'values must be parameterized');
        if (operation.method === 'POST') {
          const columns = sql.match(/\(([^)]+)\) VALUES/)?.[1].split(',').map(x => x.trim());
          assert.ok(columns);
          assert.equal(values[columns.indexOf('organization_id')], id);
        } else {
          const parameter = sql.match(/organization_id = \$(\d+)/);
          assert.ok(parameter, 'missing tenant predicate');
          assert.equal(values[Number(parameter[1]) - 1], id);
        }
        authorized++;
      }
      const items = routes.find(x => x.table === 'items' && x.operation === 'list');
      const product = '22222222-2222-4222-8222-222222222222';
      const response = await app.inject({ method: 'GET', url: items.url + '?product_id=' + product,
        headers: { authorization: 'Bearer ' + token } });
      assert.equal(response.statusCode, 200);
      const last = statements.at(-1);
      assert.match(last.sql, /organization_id = \$1 AND product_id = \$2/);
      assert.deepEqual(last.values, [id, product, 25, 0]);
      return { authorized, filtered: 1, deniedQueries, queries };
    }
    return { resources: 2, generatedFiles: 14, operations: routes.length,
      missingJwtRejected, unauthorizedRejected, queries };
  } finally {
    if (app) await app.close();
    for (const filename of cached) delete require.cache[filename];
    await fs.rm(parent, { recursive: true, force: true });
  }
}
run().then(result => process.stdout.write(JSON.stringify(result) + '\n'))
  .catch(error => { process.stderr.write('MULTITABLE_HTTP_TEST_FAILED: ' + error.message + '\n'); process.exitCode = 1; });
