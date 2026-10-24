'use strict';
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { generateIsolated } = require('../studio/isolated-generation');

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
const requests = [
  { method: 'GET', url: '/jwt-http-test', operation: 'list' },
  { method: 'GET', url: '/jwt-http-test/123', operation: 'getById' },
  { method: 'POST', url: '/jwt-http-test', operation: 'create' },
  { method: 'PATCH', url: '/jwt-http-test/123', operation: 'update' },
  { method: 'DELETE', url: '/jwt-http-test/123', operation: 'remove' }
];

describe('generated CRUD with real Fastify 5 and @fastify/jwt 10', () => {
  let fastify;
  let jwtPlugin;
  beforeAll(() => {
    fastify = require('fastify');
    jwtPlugin = require('@fastify/jwt');
  });

  async function withGeneratedApp(registerJwt, callback) {
    const parent = await fs.mkdtemp(path.join(os.tmpdir(), 'studio-fastify-jwt-'));
    const cacheEntries = [];
    let app;
    const hits = [];
    try {
      const run = await generateIsolated(definition, { tempRoot: parent });
      const routesFile = path.join(run.directory, run.artifacts.find(a => a.path.endsWith('.routes.js')).path);
      const controllerFile = routesFile.replace(/\.routes\.js$/, '.controller.js');
      const schemaFile = routesFile.replace(/\.routes\.js$/, '.schema.js');
      const repositoryFile = routesFile.replace(/\.routes\.js$/, '.repository.js');
      const controllers = {};
      for (const operation of ['list', 'getById', 'create', 'update', 'remove']) {
        controllers[operation] = async (_request, reply) => {
          hits.push(operation);
          return reply.code(200).send({ operation });
        };
      }
      for (const [filename, exports] of [
        [controllerFile, controllers],
        [schemaFile, { list: {}, getById: {}, create: {}, update: {}, remove: {} }],
        [repositoryFile, { configure() {} }]
      ]) {
        require.cache[filename] = { id: filename, filename, loaded: true, exports };
        cacheEntries.push(filename);
      }
      const routes = require(routesFile);
      cacheEntries.push(routesFile);
      app = fastify({ logger: false });
      if (registerJwt) {
        await app.register(jwtPlugin, { secret: 'studio-integration-test-secret-only' });
      }
      await app.register(routes, { database: { query() {} } });
      await app.ready();
      await callback({ app, hits });
    } finally {
      if (app) { await app.close(); }
      for (const filename of cacheEntries) { delete require.cache[filename]; }
      await fs.rm(parent, { recursive: true, force: true });
    }
  }

  test('all five operations reject missing and malformed JWT before controllers', async () => {
    await withGeneratedApp(true, async ({ app, hits }) => {
      for (const request of requests) {
        const absent = await app.inject({ method: request.method, url: request.url });
        expect(absent.statusCode).toBe(401);
        const invalid = await app.inject({
          method: request.method, url: request.url,
          headers: { authorization: 'Bearer not-a-valid-jwt' }
        });
        expect(invalid.statusCode).toBe(401);
      }
      expect(hits).toEqual([]);
    });
  });

  test('all five operations accept signed JWT and reach corresponding controllers', async () => {
    await withGeneratedApp(true, async ({ app, hits }) => {
      const token = app.jwt.sign({ sub: 'studio-test-user' });
      for (const request of requests) {
        const response = await app.inject({
          method: request.method, url: request.url,
          headers: { authorization: 'Bearer ' + token }
        });
        expect(response.statusCode).toBe(200);
        expect(response.json()).toEqual({ operation: request.operation });
      }
      expect(hits).toEqual(requests.map(request => request.operation));
    });
  });

  test('missing JWT plugin fails closed with 503 on all CRUD routes', async () => {
    await withGeneratedApp(false, async ({ app, hits }) => {
      for (const request of requests) {
        const response = await app.inject({ method: request.method, url: request.url });
        expect(response.statusCode).toBe(503);
      }
      expect(hits).toEqual([]);
    });
  });
});
