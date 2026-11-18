'use strict';
const fs = require('node:fs');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '../studio/public/index.html'), 'utf8');
const js = fs.readFileSync(path.join(__dirname, '../studio/public/app.js'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '../studio/public/app.css'), 'utf8');
test('multitable diagnostic elements and safe renderer are connected', () => {
  for (const id of ['designer-multi-diagnostics', 'designer-multi-diagnostics-status',
    'designer-multi-diagnostics-summary', 'designer-multi-diagnostics-order',
    'designer-multi-diagnostics-blockers', 'designer-multi-diagnostics-warnings',
    'designer-multi-diagnostics-fingerprint', 'designer-multi-plan-json']) {
    expect(html).toContain('id="' + id + '"');
    expect(js).toContain("'" + id + "'");
  }
  expect(js).toContain('renderMultiPreparationDiagnostics(data)');
  expect(js).toContain("preparation.kind !== 'studio.multitable.preparation-contract'");
  expect(js).toContain('preparation.generationAuthorized !== false');
  expect(js).toContain('preparation.installationAuthorized !== false');
  expect(js).toContain('preparation.publicationAuthorized !== false');
  expect(js).toContain('list.replaceChildren()');
  expect(js).toContain('item.textContent = value');
  expect(css).toContain('.multi-diagnostics-summary');
});
