'use strict';
const fs = require('node:fs');
const path = require('node:path');

test('generation UI exposes persisted integrity and digest details without HTML injection', () => {
  const html = fs.readFileSync(path.join(__dirname, '../studio/public/index.html'), 'utf8');
  const js = fs.readFileSync(path.join(__dirname, '../studio/public/app.js'), 'utf8');
  for (const id of ['generation-integrity-summary', 'generation-run-detail', 'generation-run-status', 'generation-artifact-rows']) {
    expect(html).toContain('id="' + id + '"');
    expect(js).toContain("getElementById('" + id + "')");
  }
  for (const state of ['verified', 'legacy-unverified', 'corrupt', 'missing']) {
    expect(js).toContain(state);
  }
  expect(js).toContain('file.sha256');
  expect(js).toContain('td.textContent = value');
  expect(js).not.toContain('innerHTML');
});
