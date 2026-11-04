'use strict';
jest.mock('../studio/artifact-integration-suites', () => ({
  prepareArtifactIntegrationSuites: jest.fn()
}));
jest.mock('../studio/security-evidence-executor', () => ({
  executeSecurityEvidence: jest.fn()
}));
jest.mock('../studio/security-certification', () => ({
  assessSecurityCertification: jest.fn()
}));
const { prepareArtifactIntegrationSuites } = require('../studio/artifact-integration-suites');
const { executeSecurityEvidence } = require('../studio/security-evidence-executor');
const { assessSecurityCertification } = require('../studio/security-certification');
const { evaluateIsolatedArtifactSecurity } = require('../studio/artifact-security-workflow');

beforeEach(() => jest.clearAllMocks());

test('passes generated suite paths and artifacts to evidence executor', async () => {
  const run = { mode: 'isolated-local', published: false, databaseModified: false, directory: '/tmp/module' };
  const suitePaths = { jwtCrudIntegration: 'jwt-crud.test.js', postgresqlTenantIsolation: 'tenant-postgresql.test.js' };
  const artifacts = Object.values(suitePaths).map(path => ({ path }));
  prepareArtifactIntegrationSuites.mockResolvedValue({ suitePaths, artifacts });
  executeSecurityEvidence.mockResolvedValue({ fingerprint: 'example' });
  assessSecurityCertification.mockResolvedValue({ installable: false, status: 'blocked' });
  const result = await evaluateIsolatedArtifactSecurity({
    run, definition: {}, repoRoot: '/tmp/repo', databaseUrl: 'postgresql://localhost/forge_test', checks: []
  });
  expect(executeSecurityEvidence).toHaveBeenCalledWith(expect.objectContaining({
    artifactRoot: run.directory, suitePaths, artifacts
  }));
  expect(result.installable).toBe(false);
  expect(result.published).toBe(false);
});

test('rejects non-isolated generation before any preparation', async () => {
  await expect(evaluateIsolatedArtifactSecurity({
    run: { mode: 'published', published: true, databaseModified: false },
    repoRoot: '/tmp/repo', databaseUrl: 'postgresql://localhost/forge_test'
  })).rejects.toThrow('ISOLATED_SECURITY_WORKFLOW_REQUIRED');
  expect(prepareArtifactIntegrationSuites).not.toHaveBeenCalled();
});

test('propagates evidence failure without issuing certification', async () => {
  const run = { mode: 'isolated-local', published: false, databaseModified: false, directory: '/tmp/module' };
  prepareArtifactIntegrationSuites.mockResolvedValue({
    artifacts: [{ path: 'module/jwt-crud.test.js' }],
    suitePaths: { jwtCrudIntegration: 'module/jwt-crud.test.js' }
  });
  executeSecurityEvidence.mockRejectedValue(new Error('CERTIFICATION_SUITE_NOT_PASSED'));
  await expect(evaluateIsolatedArtifactSecurity({
    run, definition: {}, repoRoot: '/tmp/repo',
    databaseUrl: 'postgresql://localhost/forge_test', checks: []
  })).rejects.toThrow('CERTIFICATION_SUITE_NOT_PASSED');
  expect(assessSecurityCertification).not.toHaveBeenCalled();
});

test('untrusted or absent execution receipt cannot grant workflow certification', async () => {
  const crypto = require('node:crypto');
  const { createEvidenceRecord } = require('../studio/security-evidence-record');
  const { issueExecutionReceipt } = require('../studio/execution-provenance-receipt');
  const run = { mode: 'isolated-local', published: false, databaseModified: false, directory: '/tmp/module' };
  const suitePaths = { jwtCrudIntegration: 'jwt-crud.test.js', postgresqlTenantIsolation: 'tenant-postgresql.test.js' };
  prepareArtifactIntegrationSuites.mockResolvedValue({
    suitePaths, artifacts: Object.values(suitePaths).map(path => ({ path }))
  });
  const fingerprint = 'a'.repeat(64);
  const evidence = createEvidenceRecord({
    fingerprint, executedAt: '2026-11-04T15:00:00.000Z', runner: 'external-runner',
    tests: {
      postgresqlTenantIsolation: { suite: 'tenant.test.js', status: 'passed', passed: 1, failed: 0 },
      jwtCrudIntegration: { suite: 'jwt.test.js', status: 'passed', passed: 1, failed: 0 }
    }
  });
  executeSecurityEvidence.mockResolvedValue(evidence);
  assessSecurityCertification.mockResolvedValue({ fingerprint, installable: false, status: 'blocked' });
  const keys = crypto.generateKeyPairSync('ed25519');
  const receipt = issueExecutionReceipt({
    evidence, runId: 'run_0123456789abcdef', issuedAt: '2026-11-04T15:01:00.000Z',
    privateKey: keys.privateKey
  });
  const base = { run, definition: {}, repoRoot: '/tmp/repo',
    databaseUrl: 'postgresql://localhost/forge_test', checks: [] };
  const absent = await evaluateIsolatedArtifactSecurity(base);
  expect(absent.provenance.verified).toBe(false);
  const valid = await evaluateIsolatedArtifactSecurity({
    ...base, executionReceipt: receipt, trustedRunnerPublicKey: keys.publicKey
  });
  expect(valid.provenance.verified).toBe(true);
  expect(valid).toMatchObject({ installable: false, certificationAuthorized: false, published: false });
  const forged = await evaluateIsolatedArtifactSecurity({
    ...base, executionReceipt: receipt,
    trustedRunnerPublicKey: crypto.generateKeyPairSync('ed25519').publicKey
  });
  expect(forged.provenance.verified).toBe(false);
  expect(forged.certificationAuthorized).toBe(false);
});
