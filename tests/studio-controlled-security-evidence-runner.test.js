'use strict';
jest.mock('../studio/security-evidence-executor', () => ({
  executeSecurityEvidence: jest.fn()
}));
jest.mock('../studio/security-certification', () => ({
  assessSecurityCertification: jest.fn()
}));
const crypto = require('node:crypto');
const { executeSecurityEvidence } = require('../studio/security-evidence-executor');
const { assessSecurityCertification } = require('../studio/security-certification');
const { createEvidenceRecord } = require('../studio/security-evidence-record');
const { verifyExecutionReceipt } = require('../studio/execution-provenance-receipt');
const { runControlledSecurityEvidence } = require('../studio/controlled-security-evidence-runner');

const fingerprint = 'a'.repeat(64);
const evidence = createEvidenceRecord({
  fingerprint, executedAt: '2026-11-04T15:00:00.000Z', runner: 'sbn-forge-artifact-jest-unverified',
  tests: {
    postgresqlTenantIsolation: { suite: 'tenant.test.js', status: 'passed', passed: 2, failed: 0 },
    jwtCrudIntegration: { suite: 'jwt.test.js', status: 'passed', passed: 3, failed: 0 }
  }
});
let keys, input;
beforeEach(() => {
  jest.clearAllMocks();
  keys = crypto.generateKeyPairSync('ed25519');
  input = {
    repoRoot: '/repo', artifactRoot: '/isolated/artifact',
    artifacts: [{ path: 'module.js' }], checks: [],
    databaseUrl: 'postgresql://localhost/forge_test',
    suitePaths: { postgresqlTenantIsolation: 'tenant.test.js', jwtCrudIntegration: 'jwt.test.js' },
    runnerPrivateKey: keys.privateKey, trustedRunnerPublicKey: keys.publicKey
  };
  executeSecurityEvidence.mockResolvedValue(evidence);
  assessSecurityCertification.mockResolvedValue({
    fingerprint, evidenceMatches: true, status: 'blocked', installable: false
  });
});

test('runs evidence first and signs only its verified digest and artifact fingerprint', async () => {
  const result = await runControlledSecurityEvidence(input);
  expect(executeSecurityEvidence).toHaveBeenCalledWith(expect.objectContaining({
    repoRoot: input.repoRoot, artifactRoot: input.artifactRoot,
    databaseUrl: input.databaseUrl, suitePaths: input.suitePaths
  }));
  expect(result.receipt.runId).toMatch(/^run_[a-f0-9]{32}$/);
  expect(result.receipt.evidenceDigest).toBe(evidence.digest);
  expect(result.provenance.verified).toBe(true);
  expect(verifyExecutionReceipt({
    evidence, receipt: result.receipt,
    trustedRunnerPublicKey: keys.publicKey, expectedFingerprint: fingerprint
  }).verified).toBe(true);
  expect(result).toMatchObject({
    certificationAuthorized: false, installable: false, published: false,
    databaseModified: false
  });
  expect(JSON.stringify(result)).not.toContain('PRIVATE KEY');
});

test('refuses to execute without external key pair', async () => {
  await expect(runControlledSecurityEvidence({
    ...input, runnerPrivateKey: undefined
  })).rejects.toThrow('EXTERNAL_RUNNER_KEYS_REQUIRED');
  expect(executeSecurityEvidence).not.toHaveBeenCalled();
});

test('failed test execution never issues a receipt', async () => {
  executeSecurityEvidence.mockRejectedValue(new Error('CERTIFICATION_SUITE_NOT_PASSED'));
  await expect(runControlledSecurityEvidence(input)).rejects.toThrow('CERTIFICATION_SUITE_NOT_PASSED');
  expect(assessSecurityCertification).not.toHaveBeenCalled();
});

test('rejects evidence mismatch before signing', async () => {
  assessSecurityCertification.mockResolvedValue({ fingerprint: 'b'.repeat(64), evidenceMatches: false });
  await expect(runControlledSecurityEvidence(input)).rejects.toThrow('RUNNER_ARTIFACT_EVIDENCE_MISMATCH');
});

test('rejects mismatched runner public key after execution', async () => {
  await expect(runControlledSecurityEvidence({
    ...input, trustedRunnerPublicKey: crypto.generateKeyPairSync('ed25519').publicKey
  })).rejects.toThrow('RUNNER_RECEIPT_VERIFICATION_FAILED');
});
