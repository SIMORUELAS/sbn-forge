'use strict';
const fs = require('node:fs');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '../studio/public/index.html'), 'utf8');
const js = fs.readFileSync(path.join(__dirname, '../studio/public/app.js'), 'utf8');

test('modules section has a real inventory workspace instead of the placeholder', () => {
  expect(html).toContain('id="modules-workspace"');
  expect(html).toContain('id="modules-rows"');
  expect(html).toContain('id="modules-preview"');
  expect(js).toContain("document.getElementById('modules-workspace').hidden = id !== 'modulos'");
  expect(js).toContain("id === 'historial' || id === 'modulos'");
});
test('modules inventory reuses existing read-only definitions and run endpoints', () => {
  expect(js).toContain("fetch('/api/studio/definitions')");
  expect(js).toContain("fetch('/api/studio/runs')");
  expect(js).toContain("fetch('/api/studio/preview/' + encodeURIComponent(name))");
  expect(js).toContain('async function refreshModules()');
});
test('module preview uses textContent and never publishes code', () => {
  expect(js).toContain("document.getElementById('modules-preview-json').textContent =");
  const section = js.slice(js.indexOf('async function refreshModules()'));
  expect(section).not.toMatch(/innerHTML|fetch\('\/api\/studio\/runs',\s*\{\s*method:\s*'POST'/);
  expect(html).not.toContain('id="modules-publish"');
});
