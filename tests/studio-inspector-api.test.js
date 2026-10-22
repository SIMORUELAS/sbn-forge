'use strict';
const http = require('node:http');
const { createStudioServer } = require('../studio/server');

describe('Studio read-only inspector API', () => {
  let server;
  let port;
  let old;
  beforeAll(async () => {
    old = { ...process.env };
    process.env.FORGE_STUDIO_DB_INSPECT = '1';
    process.env.FORGE_STUDIO_DB_NAME = 'sbn_portal_test';
    process.env.FORGE_STUDIO_DB_USER = 'readonly';
    process.env.FORGE_STUDIO_DB_PASSWORD = 'test-only';
    const datasource = {
      query: jest.fn(async (sql) => {
        if (sql.includes('AS exists')) return { rows: [{ exists: true }] };
        return { rows: [] };
      }),
      close: jest.fn(async () => {})
    };
    server = createStudioServer({ createDatasource: () => datasource });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    port = server.address().port;
  });
  afterAll(async () => {
    await new Promise(resolve => server.close(resolve));
    for (const key of ['FORGE_STUDIO_DB_INSPECT','FORGE_STUDIO_DB_NAME','FORGE_STUDIO_DB_USER','FORGE_STUDIO_DB_PASSWORD']) {
      if (old[key] === undefined) delete process.env[key];
      else process.env[key] = old[key];
    }
  });
  const request = (path, method = 'GET') => new Promise((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port, path, method }, res => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(body) }));
    });
    req.on('error', reject);
    req.end();
  });
  test('returns inspected metadata without a browser-provided password', async () => {
    const res = await request('/api/studio/inspect?schema=product_hub&table=managed_products');
    expect(res.status).toBe(200);
    expect(res.data.schema).toBe('product_hub');
    expect(res.data.table).toBe('managed_products');
    expect(JSON.stringify(res.data)).not.toContain('test-only');
  });
  test('rejects malformed identifiers and mutations', async () => {
    expect((await request('/api/studio/inspect?schema=public%3Bdrop&table=users')).status).toBe(400);
    expect((await request('/api/studio/inspect?schema=public&table=users', 'POST')).status).toBe(405);
  });
});
