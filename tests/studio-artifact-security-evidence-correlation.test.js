'use strict';
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { assessSecurityCertification, REQUIRED } = require('../studio/security-certification');
const { createEvidenceRecord } = require('../studio/security-evidence-record');
const { correlateArtifactSecurityEvidence } = require('../studio/artifact-security-evidence-correlation');

let root;
let artifacts;
let checks;
let evidence;
beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-correlate-'));
  await fs.writeFile(path.join(root, 'sample.routes.js'), 'jwtVerify authorizeOperation organizationId get post');
  await fs.writeFile(path.join(root, 'sample.repository.js'), 'organization_id');
  artifacts = [{ path: 'sample.routes.js' }, { path: 'sample.repository.js' }];
  checks = REQUIRED.map(check => ({ check, status: 'passed' }));
  const assessment = await assessSecurityCertification(root, artifacts, checks);
  evidence = createEvidenceRecord({
    fingerprint: assessment.fingerprint,
    executedAt: '2026-11-04T12:00:00.000Z',
    runner: 'unverified-local-runner',
    tests: {
      postgresqlTenantIsolation: { suite: 'tenant.test.js', status: 'passed', passed: 1, failed: 0 },
      jwtCrudIntegration: { suite: 'jwt.test.js', status: 'passed', passed: 1, failed: 0 }
    }
  });
});
afterEach(async () => { await fs.rm(root, { recursive: true, force: true }); });

test('correlates digest and artifact fingerprint but never grants certification', async () => {
  const result = await correlateArtifactSecurityEvidence({ artifactRoot: root, artifacts, checks, evidence });
  expect(result).toMatchObject({
    status: 'blocked', installable: false, published: false,
    certificationAuthorized: false, independentlyVerifiedChecks: [],
    execution: { status: 'reported', reason: 'EXECUTION_PROVENANCE_UNVERIFIED' }
  });
  expect(result.inspection.authoritative).toBe(false);
  expect(result.declaredChecks).toHaveLength(REQUIRED.length);
});

test('rejects tampered evidence digest and modified artifacts', async () => {
  const base = { artifactRoot: root, artifacts, checks, evidence };
  const digest = await correlateArtifactSecurityEvidence({ ...base, evidence: { ...evidence, digest: '0'.repeat(64) } });
  expect(digest.execution.reason).toBe('EXECUTION_DIGEST_MISMATCH');
  expect(digest.installable).toBe(false);
  await fs.writeFile(path.join(root, 'sample.repository.js'), 'organization_id modified');
  const changed = await correlateArtifactSecurityEvidence(base);
  expect(changed.execution.reason).toBe('EXECUTION_ARTIFACT_MISMATCH');
  expect(changed.certificationAuthorized).toBe(false);
});

test('missing execution evidence cannot be promoted from passed declarations', async () => {
  const result = await correlateArtifactSecurityEvidence({
    artifactRoot: root, artifacts, checks, evidence: null
  });
  expect(result.execution.status).toBe('unverified');
  expect(result.independentlyVerifiedChecks).toEqual([]);
  expect(result.status).toBe('blocked');
});
