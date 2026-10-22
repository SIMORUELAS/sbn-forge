'use strict';
const http = require('node:http');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createStudioServer } = require('../studio/server');

function request(port, route, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: '127.0.0.1', port, path: route, method,
      headers: data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {}
    }, res => {
      let text = '';
      res.on('data', chunk => { text += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(text) }));
    });
    req.on('error', reject);
    req.end(data);
  });
}
describe('Studio web generation safety', () => {
  let server;
  let port;
  let tempRoot;
  beforeAll(async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'studio-web-test-'));
    server = createStudioServer({ runsDirectory: path.join(tempRoot, 'runs') });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    port = server.address().port;
  });
  afterAll(async () => { await new Promise(resolve => server.close(resolve)); await fs.rm(tempRoot, { recursive: true, force: true }); });
  test('lists empty session history', async () => {
    const result = await request(port, '/api/studio/runs');
    expect(result.status).toBe(200);
    expect(result.body.runs).toEqual([]);
  });
  test('rejects web generation without explicit server opt-in', async () => {
    const previous = process.env.FORGE_STUDIO_ALLOW_WEB_GENERATION;
    delete process.env.FORGE_STUDIO_ALLOW_WEB_GENERATION;
    try {
      const result = await request(port, '/api/studio/runs', 'POST', { name: 'product_development_projects' });
      expect(result.status).toBe(403);
    } finally {
      if (previous === undefined) { delete process.env.FORGE_STUDIO_ALLOW_WEB_GENERATION; }
      else { process.env.FORGE_STUDIO_ALLOW_WEB_GENERATION = previous; }
    }
  });
  test('rejects unknown run artifact routes', async () => {
    const result = await request(port, '/api/studio/runs/00000000-0000-0000-0000-000000000000/file?path=README.md');
    expect(result.status).toBe(404);
  });
});
