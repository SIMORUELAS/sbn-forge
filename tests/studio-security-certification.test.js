'use strict';
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { assessSecurityCertification, REQUIRED } = require('../studio/security-certification');

test('certification is bound to artifact bytes and never grants installation', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-cert-'));
  const artifact = { path: 'demo.repository.js' };
  try {
    await fs.writeFile(path.join(root, artifact.path), 'module.exports = {};');
    const checks = REQUIRED.map(check => ({ check, status: 'passed' }));
    const initial = await assessSecurityCertification(root, [artifact], checks);
    expect(initial.installable).toBe(false);
    expect(initial.evidenceMatches).toBe(false);
    const evidence = {
      fingerprint: initial.fingerprint,
      postgresqlTenantIsolation: 'passed',
      jwtCrudIntegration: 'passed'
    };
    const matching = await assessSecurityCertification(root, [artifact], checks, evidence);
    expect(matching.evidenceMatches).toBe(true);
    expect(matching.installable).toBe(false);
    expect(matching.reason).toBe('TRUSTED_CERTIFICATION_NOT_IMPLEMENTED');
    await fs.writeFile(path.join(root, artifact.path), 'module.exports = { changed: true };');
    const changed = await assessSecurityCertification(root, [artifact], checks, evidence);
    expect(changed.fingerprint).not.toBe(initial.fingerprint);
    expect(changed.evidenceMatches).toBe(false);
    expect(changed.status).toBe('blocked');
    const missing = await assessSecurityCertification(root, [artifact], []);
    expect(missing.status).toBe('blocked');
    expect(missing.required).toHaveLength(REQUIRED.length);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
