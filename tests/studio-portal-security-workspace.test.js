'use strict';
const fs = require('node:fs');
const path = require('node:path');
const server = fs.readFileSync(path.join(__dirname, '../studio/server.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '../studio/public/index.html'), 'utf8');
const app = fs.readFileSync(path.join(__dirname, '../studio/public/app.js'), 'utf8');

test('Portal security endpoint is read-only and validates saved definitions', () => {
  expect(server).toContain("pathname.startsWith('/api/studio/portal-security/')");
  expect(server).toContain("await definitions.get(name)");
  expect(server).toContain('moduleName: name, operations: OPERATIONS');
  expect(server).toContain("if (req.method !== 'GET')");
});
test('browser displays checks without authorization or mutation controls', () => {
  expect(html).toContain('id="generation-portal-security-status"');
  expect(html).toContain('id="generation-portal-security-checks"');
  expect(app).toContain("fetch('/api/studio/portal-security/' + encodeURIComponent(run.name))");
  expect(app).toContain('checks.replaceChildren()');
  expect(app).toContain('item.textContent = check.id');
  expect(html).not.toContain('id="generation-portal-security-authorize"');
});
test('report is scoped to selected run and fails closed on errors', () => {
  expect(app).toContain('if (!activeRun || activeRun.id !== run.id) { return; }');
  expect(app).toContain('Instalación y publicación deshabilitadas.');
  expect(app).toContain('refreshPortalSecurity(run).catch(() => {});');
});
