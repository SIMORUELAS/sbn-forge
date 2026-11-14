'use strict';
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { createStudioServer } = require('../studio/server');
const html = fs.readFileSync(path.join(__dirname, '../studio/public/index.html'), 'utf8');
const js = fs.readFileSync(path.join(__dirname, '../studio/public/app.js'), 'utf8');
describe('Studio PostgreSQL connections workspace', () => {
  test('exposes connected workspace and all active controls', () => {
    for (const id of ['connections-workspace', 'connections-refresh', 'connections-check',
      'connections-inspector', 'connections-message', 'connections-rows']) {
      expect(html).toContain('id="' + id + '"');
      expect(js).toContain("getElementById('" + id + "')");
    }
    expect(js).toContain("showSection('inspector')");
    expect(js).not.toContain('innerHTML');
  });
  test('unconfigured status exposes no secrets or database access', async () => {
    const old = Object.fromEntries(['FORGE_STUDIO_DB_INSPECT','FORGE_STUDIO_DB_NAME',
      'FORGE_STUDIO_DB_USER','FORGE_STUDIO_DB_PASSWORD'].map(key => [key, process.env[key]]));
    for (const key of Object.keys(old)) { delete process.env[key]; }
    const server = createStudioServer();
    try {
      await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
      const request = path => new Promise((resolve, reject) => {
        http.get({ host: '127.0.0.1', port: server.address().port, path }, response => {
          let body = '';
          response.on('data', chunk => { body += chunk; });
          response.on('end', () => resolve({ status: response.statusCode, data: JSON.parse(body) }));
        }).on('error', reject);
      });
      expect(await request('/api/studio/connections/status')).toMatchObject({
        status: 200, data: { configured: false, passwordExposed: false, writesAuthorized: false }
      });
      expect((await request('/api/studio/connections/check')).status).toBe(503);
    } finally {
      await new Promise(resolve => server.close(resolve));
      for (const [key, value] of Object.entries(old)) {
        if (value === undefined) { delete process.env[key]; } else { process.env[key] = value; }
      }
    }
  });
});
