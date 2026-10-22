'use strict';
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { createStudioServer } = require('../studio/server');

describe('Studio definitions HTTP API', () => {
  let server;
  let directory;
  let port;
  beforeAll(async () => {
    directory = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-studio-http-'));
    server = createStudioServer({ definitionsDirectory: directory });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    port = server.address().port;
  });
  afterAll(async () => {
    await new Promise(resolve => server.close(resolve));
    await fs.rm(directory, { recursive: true, force: true });
  });
  function request(method, endpoint, payload, headers = {}) {
    return new Promise((resolve, reject) => {
      const req = http.request({ hostname: '127.0.0.1', port, path: endpoint, method, headers }, res => {
        let body = '';
        res.on('data', chunk => { body += chunk; });
        res.on('end', () => resolve({ status: res.statusCode, body: body ? JSON.parse(body) : null }));
      });
      req.on('error', reject);
      if (payload) { req.write(JSON.stringify(payload)); }
      req.end();
    });
  }
  const definition = {
    version: 1, name: 'sample_module',
    source: { type: 'postgresql', schema: 'product_hub', table: 'managed_products' },
    primaryKey: { name: 'managed_products_pkey', columns: ['id'] },
    foreignKeys: [],
    fields: [{ name: 'id', dataType: 'uuid', nullable: false, visible: true, editable: false, required: false }]
  };
  test('save, list and open through HTTP', async () => {
    expect((await request('POST', '/api/studio/definitions', definition, { 'Content-Type': 'application/json' })).status).toBe(200);
    expect((await request('GET', '/api/studio/definitions')).body.definitions).toContain('sample_module');
    expect((await request('GET', '/api/studio/definitions/sample_module')).body.source.table).toBe('managed_products');
  });
  test('rejects invalid payload, origin and traversal', async () => {
    expect((await request('POST', '/api/studio/definitions', { ...definition, name: '../escape' }, { 'Content-Type': 'application/json' })).status).toBe(400);
    expect((await request('POST', '/api/studio/definitions', definition, { 'Content-Type': 'application/json', Origin: 'https://evil.example' })).status).toBe(403);
    expect((await request('GET', '/api/studio/definitions/%2e%2e%2fsecret')).status).toBe(400);
  });
});
