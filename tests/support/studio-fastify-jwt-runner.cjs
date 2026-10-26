'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const fastify = require('fastify');
const jwt = require('@fastify/jwt');
const { generateIsolated } = require('../../studio/isolated-generation');

const metadata = { defaultValue: null, identity: false, maxLength: null, precision: null, scale: null };
const definition = {
  version: 1, name: 'jwt_http_test',
  source: { type: 'postgresql', schema: 'product_hub', table: 'jwt_http_test' },
  primaryKey: { name: 'jwt_http_test_pkey', columns: ['id'] }, foreignKeys: [],
  fields: [
    { name: 'id', dataType: 'uuid', nullable: false, visible: true, editable: false, required: false, ...metadata, defaultValue: 'gen_random_uuid()' },
    { name: 'name', dataType: 'text', nullable: false, visible: true, editable: true, required: true, ...metadata }
  ]
};
const operations = [
  { method: 'GET', url: '/jwt-http-test', operation: 'list' },
  { method: 'GET', url: '/jwt-http-test/123', operation: 'getById' },
  { method: 'POST', url: '/jwt-http-test', operation: 'create' },
  { method: 'PATCH', url: '/jwt-http-test/123', operation: 'update' },
  { method: 'DELETE', url: '/jwt-http-test/123', operation: 'remove' }
];

async function withApp(hasJwt, callback) {
  const parent = await fs.mkdtemp(path.join(os.tmpdir(), 'studio-fastify-jwt-'));
  const cached = [];
  const hits = [];
  let app;
  try {
    const run = await generateIsolated(definition, { tempRoot: parent });
    const route = path.join(run.directory, run.artifacts.find(a => a.path.endsWith('.routes.js')).path);
    const stub = (suffix, exports) => {
      const filename = route.replace(/\.routes\.js$/, suffix);
      require.cache[filename] = { id: filename, filename, loaded: true, exports };
      cached.push(filename);
    };
    const controllers = {};
    for (const operation of operations) {
      controllers[operation.operation] = async (_request, reply) => {
        hits.push(operation.operation);
        return reply.code(200).send({ operation: operation.operation });
      };
    }
    stub('.controller.js', controllers);
    stub('.schema.js', { list: {}, getById: {}, create: {}, update: {}, remove: {} });
    stub('.repository.js', { configure() {} });
    const routes = require(route);
    cached.push(route);
    app = fastify({ logger: false });
    if (hasJwt) await app.register(jwt, { secret: 'studio-integration-test-secret-only' });
    await app.register(routes, { database: { query() {} } });
    await app.ready();
    await callback(app, hits);
  } finally {
    if (app) await app.close();
    for (const filename of cached) delete require.cache[filename];
    await fs.rm(parent, { recursive: true, force: true });
  }
}

async function main() {
  const report = {
    operations: operations.length, missingJwtRejected: 0, invalidJwtRejected: 0,
    validJwtAccepted: 0, missingPluginRejected: 0, controllerCallsOnRejection: 0
  };
  await withApp(true, async (app, hits) => {
    for (const op of operations) {
      const missing = await app.inject({ method: op.method, url: op.url });
      assert.equal(missing.statusCode, 401, op.operation + ' missing JWT');
      report.missingJwtRejected++;
      const invalid = await app.inject({
        method: op.method, url: op.url,
        headers: { authorization: 'Bearer not-a-valid-jwt' }
      });
      assert.equal(invalid.statusCode, 401, op.operation + ' invalid JWT');
      report.invalidJwtRejected++;
    }
    report.controllerCallsOnRejection += hits.length;
    assert.equal(hits.length, 0);
    const token = app.jwt.sign({ sub: 'studio-test-user' });
    for (const op of operations) {
      const response = await app.inject({
        method: op.method, url: op.url,
        headers: { authorization: 'Bearer ' + token }
      });
      assert.equal(response.statusCode, 200, op.operation + ' valid JWT');
      assert.deepEqual(response.json(), { operation: op.operation });
      report.validJwtAccepted++;
    }
    assert.deepEqual(hits, operations.map(op => op.operation));
  });
  await withApp(false, async (app, hits) => {
    for (const op of operations) {
      const response = await app.inject({ method: op.method, url: op.url });
      assert.equal(response.statusCode, 503, op.operation + ' missing JWT plugin');
      report.missingPluginRejected++;
    }
    report.controllerCallsOnRejection += hits.length;
    assert.equal(hits.length, 0);
  });
  process.stdout.write(JSON.stringify(report) + '\n');
}
main().catch(error => { process.stderr.write(error.stack + '\n'); process.exitCode = 1; });
