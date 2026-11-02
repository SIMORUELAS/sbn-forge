'use strict';
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { assessSecurityCertification } = require('../studio/security-certification');

test('fingerprint includes manifest and auxiliary generated files', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-complete-fingerprint-'));
  try {
    const names = ['demo.repository.js', 'sbn-forge.manifest.json', 'demo.routes.js', 'README.md'];
    for (const name of names) {
      await fs.writeFile(path.join(root, name), name);
    }
    const artifacts = names.map(name => ({ path: name }));
    const first = await assessSecurityCertification(root, artifacts, []);
    expect(first.fingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(first.installable).toBe(false);
    await fs.writeFile(path.join(root, 'README.md'), 'changed');
    const second = await assessSecurityCertification(root, artifacts, []);
    expect(second.fingerprint).not.toBe(first.fingerprint);
    await fs.writeFile(path.join(root, 'sbn-forge.manifest.json'), '{}');
    const third = await assessSecurityCertification(root, artifacts, []);
    expect(third.fingerprint).not.toBe(second.fingerprint);
    expect((await assessSecurityCertification(root, [], [])).reason).toBe('INVALID_ARTIFACT_SET');
    expect((await assessSecurityCertification(root, [artifacts[0], artifacts[0]], [])).reason)
      .toBe('INVALID_ARTIFACT_SET');
    expect((await assessSecurityCertification(root, [{ path: '../outside.js' }], [])).reason)
      .toBe('INVALID_ARTIFACT_PATH');
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
