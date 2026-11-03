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
      executedAt: '2026-10-28T12:00:00.000Z',
      runner: 'local-jest',
      tests: {
        postgresqlTenantIsolation: { suite: 'tenant-postgresql', status: 'passed', passed: 3, failed: 0 },
        jwtCrudIntegration: { suite: 'fastify-jwt', status: 'passed', passed: 1, failed: 0 }
      }
    };
    const matching = await assessSecurityCertification(root, [artifact], checks, evidence);
    expect(matching.evidenceMatches).toBe(true);
    expect(matching.evidence.trust).toBe('unverified');
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

test('invalid artifact lists and duplicate certification checks fail closed', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-cert-invalid-'));
  try {
    await fs.writeFile(path.join(root, 'module.js'), 'module.exports = {};');
    for (const artifacts of [undefined, null, [], [null], [{}], [{ path: '' }]]) {
      const result = await assessSecurityCertification(root, artifacts, []);
      expect(result.installable).toBe(false);
      expect(result.reason).toBe('INVALID_ARTIFACT_SET');
    }
    const checks = REQUIRED.map(check => ({ check, status: 'passed' }));
    const duplicated = await assessSecurityCertification(root, [{ path: 'module.js' }], [
      ...checks, { check: REQUIRED[0], status: 'passed' }
    ]);
    expect(duplicated.installable).toBe(false);
    expect(duplicated.required.every(item => item.status === 'missing')).toBe(true);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('certification rejects tampered evidence digest even when the artifact fingerprint matches', async () => {
  const { createEvidenceRecord } = require('../studio/security-evidence-record');
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-cert-digest-'));
  try {
    await fs.writeFile(path.join(root, 'module.js'), 'module.exports = {};');
    const artifacts = [{ path: 'module.js' }];
    const checks = REQUIRED.map(check => ({ check, status: 'passed' }));
    const initial = await assessSecurityCertification(root, artifacts, checks);
    const evidence = createEvidenceRecord({
      fingerprint: initial.fingerprint,
      executedAt: '2026-11-03T12:00:00.000Z',
      runner: 'sbn-forge-artifact-jest-unverified',
      tests: {
        postgresqlTenantIsolation: { suite: 'tenant.test.js', status: 'passed', passed: 2, failed: 0 },
        jwtCrudIntegration: { suite: 'jwt.test.js', status: 'passed', passed: 2, failed: 0 }
      }
    });
    const valid = await assessSecurityCertification(root, artifacts, checks, evidence);
    expect(valid.evidenceMatches).toBe(true);
    expect(valid.installable).toBe(false);
    const tampered = await assessSecurityCertification(root, artifacts, checks, {
      ...evidence, tests: {
        ...evidence.tests,
        jwtCrudIntegration: { ...evidence.tests.jwtCrudIntegration, passed: 99 }
      }
    });
    expect(tampered.evidenceMatches).toBe(false);
    expect(tampered.status).toBe('blocked');
    expect(tampered.installable).toBe(false);
    const forgedDigest = await assessSecurityCertification(root, artifacts, checks, {
      ...evidence, digest: '0'.repeat(64)
    });
    expect(forgedDigest.evidenceMatches).toBe(false);
    expect(forgedDigest.status).toBe('blocked');
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
