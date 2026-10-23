'use strict';
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { diagnoseArtifacts } = require('../studio/artifact-diagnostics');

test('parses syntax and verifies manifest without executing generated code', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-diagnostics-'));
  try {
    await fs.mkdir(path.join(root, 'modules'));
    await fs.writeFile(path.join(root, 'modules', 'valid.js'), 'globalThis.__mustNotRun = true;');
    await fs.writeFile(path.join(root, 'modules', 'manifest.json'), JSON.stringify({ files: [
      { relativePath: 'modules/valid.js' }, { relativePath: 'modules/manifest.json' }
    ] }));
    const files = [{ path: 'modules/valid.js' }, { path: 'modules/manifest.json' }];
    let result = await diagnoseArtifacts(root, files);
    expect(result.checks.find(item => item.check === 'javascript-syntax').status).toBe('passed');
    expect(globalThis.__mustNotRun).toBeUndefined();
    await fs.writeFile(path.join(root, 'modules', 'invalid.js'), 'function ( {');
    result = await diagnoseArtifacts(root, [...files, { path: 'modules/invalid.js' }]);
    expect(result.status).toBe('failed');
    expect(result.checks.some(item => item.status === 'failed' && item.check === 'javascript-syntax')).toBe(true);
    expect(result.checks.some(item => item.check === 'installation-readiness' && item.status === 'warning')).toBe(true);
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});
