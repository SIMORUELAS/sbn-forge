'use strict';
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { generateIsolated } = require('../studio/isolated-generation');

const meta = { defaultValue: null, identity: false, maxLength: null, precision: null, scale: null };
const definition = {
  version: 1, name: 'jwt_http_test',
  source: { type: 'postgresql', schema: 'product_hub', table: 'jwt_http_test' },
  primaryKey: { name: 'jwt_http_test_pkey', columns: ['id'] }, foreignKeys: [],
  fields: [
    { name: 'id', dataType: 'uuid', nullable: false, visible: true, editable: false, required: false, ...meta, defaultValue: 'gen_random_uuid()' },
    { name: 'name', dataType: 'text', nullable: false, visible: true, editable: true, required: true, ...meta }
  ]
};

test('HTTP requests without JWT never reach any generated CRUD controller', async () => {
  const parent = await fs.mkdtemp(path.join(os.tmpdir(), 'studio-jwt-http-'));
  let server;
  const mocked = [];
  try {
    const run = await generateIsolated(definition, { tempRoot: parent });
    const routesFile = path.join(run.directory, run.artifacts.find(a => a.path.endsWith('.routes.js')).path);
    const controllerFile = routesFile.replace(/\.routes\.js$/, '.controller.js');
    const schemasFile = routesFile.replace(/\.routes\.js$/, '.schema.js');
    const repositoryFile = routesFile.replace(/\.routes\.js$/, '.repository.js');
    const hits = [];
    const controllers = {};
    for (const name of ['list', 'getById', 'create', 'update', 'remove']) {
      controllers[name] = async () => { hits.push(name); };
    }
    for (const [filename, exports] of [
      [controllerFile, controllers],
      [schemasFile, { list: {}, getById: {}, create: {}, update: {}, remove: {} }],
      [repositoryFile, { configure() {} }]
    ]) {
      require.cache[filename] = { id: filename, filename, loaded: true, exports };
      mocked.push(filename);
    }
    const hooks = [];
    const operations = [];
    const fastify = { pg: { query() {} }, addHook(name, fn) { if (name === 'onRequest') { hooks.push(fn); } } };
    for (const method of ['get', 'post', 'patch', 'delete']) {
      fastify[method] = (url, options, handler) => operations.push({ method: method.toUpperCase(), url, handler });
    }
    const register = require(routesFile);
    mocked.push(routesFile);
    await register(fastify);
    expect(hooks).toHaveLength(1);
    expect(operations).toHaveLength(5);

    // Node HTTP harness exercises the emitted guard and route registrations.
    // It does not claim full Fastify/@fastify-jwt integration.
    server = http.createServer(async (request, response) => {
      const route = operations.find(op => {
        if (op.method !== request.method) { return false; }
        const pattern = '^' + op.url.replace(/:[A-Za-z_][A-Za-z0-9_]*/g, '[^/]+') + '$';
        return new RegExp(pattern).test(request.url);
      });
      if (!route) { response.writeHead(404); response.end(); return; }
      const reply = {
        code(status) { response.statusCode = status; return this; },
        send(payload) { if (!response.writableEnded) {
          response.setHeader('Content-Type', 'application/json');
          response.end(JSON.stringify(payload));
        } return this; }
      };
      const fakeRequest = { jwtVerify: async () => { throw new Error('missing JWT'); } };
      try {
        for (const hook of hooks) {
          await hook(fakeRequest, reply);
          if (response.writableEnded) { return; }
        }
        await route.handler(fakeRequest, reply);
        if (!response.writableEnded) { response.end(); }
      } catch {
        if (!response.writableEnded) { response.statusCode = 401; response.end(); }
      }
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const port = server.address().port;
    expect(operations.map(op => op.url)).toEqual(expect.arrayContaining(['/jwt-http-test']));
    for (const [method, url] of [
      ['GET', '/jwt-http-test'], ['GET', '/jwt-http-test/123'],
      ['POST', '/jwt-http-test'], ['PATCH', '/jwt-http-test/123'],
      ['DELETE', '/jwt-http-test/123']
    ]) {
      const result = await fetch('http://127.0.0.1:' + port + url, { method });
      expect(result.status).toBe(401);
    }
    expect(hits).toEqual([]);
  } finally {
    if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
    for (const filename of mocked) { delete require.cache[filename]; }
    await fs.rm(parent, { recursive: true, force: true });
  }
});
