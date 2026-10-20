'use strict';
const http = require('node:http');
const { createStudioServer } = require('../studio/server');

describe('SBN Forge Studio local preview', () => {
  let server;
  let port;
  beforeAll(async () => {
    server = createStudioServer();
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    port = server.address().port;
  });
  afterAll(async () => { await new Promise(resolve => server.close(resolve)); });
  const request = (path, method = 'GET') => new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path, method }, res => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    req.on('error', reject);
    req.end();
  });
  test('renders the Studio dashboard as a local prototype', async () => {
    const res = await request('/');
    expect(res.status).toBe(200);
    expect(res.body).toContain('SBN Forge Studio');
    expect(res.body).toContain('Modo demostración');
    expect(res.headers['content-security-policy']).toContain("default-src 'self'");
  });
  test('serves only allowlisted assets', async () => {
    expect((await request('/app.css')).status).toBe(200);
    expect((await request('/app.js')).status).toBe(200);
    expect((await request('/../package.json')).status).toBe(404);
    expect((await request('/not-found')).status).toBe(404);
  });
  test('disallows state-changing methods', async () => {
    const res = await request('/', 'POST');
    expect(res.status).toBe(405);
    expect(res.headers.allow).toContain('GET');
  });
});
