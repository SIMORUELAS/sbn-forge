'use strict';
const fs = require('node:fs');
const path = require('node:path');
test('execution console provides history, artifact table and safe numbered source viewer', () => {
  const html = fs.readFileSync(path.join(__dirname, '../studio/public/index.html'), 'utf8');
  const js = fs.readFileSync(path.join(__dirname, '../studio/public/app.js'), 'utf8');
  const css = fs.readFileSync(path.join(__dirname, '../studio/public/app.css'), 'utf8');
  for (const id of ['history-workspace', 'history-refresh', 'history-table-container',
    'generation-runs-list', 'generation-code-lines', 'generation-code-filename']) {
    expect(html).toContain('id="' + id + '"');
    expect(js).toContain("getElementById('" + id + "')");
  }
  expect(js).toContain("showSection('generacion')");
  expect(js).toContain("new Date(run.createdAt).toLocaleString('es-MX')");
  expect(js).toContain('text.textContent = line');
  expect(js).toContain('number.textContent = String(index + 1)');
  expect(js).not.toContain('innerHTML');
  expect(css).toContain('overflow:auto');
  expect(css).toContain('white-space:pre');
});
