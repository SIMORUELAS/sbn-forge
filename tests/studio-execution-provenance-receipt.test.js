'use strict';
const crypto = require('node:crypto');
const { createEvidenceRecord } = require('../studio/security-evidence-record');
const { issueExecutionReceipt, verifyExecutionReceipt } = require('../studio/execution-provenance-receipt');

const fingerprint = 'a'.repeat(64);
const base = {
  fingerprint, executedAt: '2026-11-04T15:00:00.000Z', runner: 'unverified-local-runner',
  tests: {
    postgresqlTenantIsolation: { suite: 'tenant.test.js', status: 'passed', passed: 2, failed: 0 },
    jwtCrudIntegration: { suite: 'jwt.test.js', status: 'passed', passed: 3, failed: 0 }
  }
};
const runId = 'run_0123456789abcdef';
const issuedAt = '2026-11-04T15:01:00.000Z';
let evidence, keys, receipt;
beforeEach(() => {
  evidence = createEvidenceRecord(base);
  keys = crypto.generateKeyPairSync('ed25519');
  receipt = issueExecutionReceipt({ evidence, runId, issuedAt, privateKey: keys.privateKey });
});
const verify = (overrides = {}) => verifyExecutionReceipt({
  evidence, receipt, trustedRunnerPublicKey: keys.publicKey,
  expectedFingerprint: fingerprint, ...overrides
});

test('valid runner signature authenticates receipt but never certifies or installs', () => {
  expect(verify()).toMatchObject({
    verified: true, installable: false,
    reason: 'EXECUTION_RECEIPT_VERIFIED_NOT_CERTIFIED',
    runId, fingerprint
  });
  expect(receipt).not.toHaveProperty('privateKey');
});

test('rejects wrong trust anchor, forged signature and changed run metadata', () => {
  expect(verify({ trustedRunnerPublicKey: crypto.generateKeyPairSync('ed25519').publicKey }).verified).toBe(false);
  expect(verify({ receipt: { ...receipt, runId: 'run_ffffffffffffffff' } }).verified).toBe(false);
  expect(verify({ receipt: { ...receipt, issuedAt: '2026-11-05T15:01:00.000Z' } }).verified).toBe(false);
  expect(verify({ receipt: { ...receipt, signature: 'A'.repeat(86) + '==' } }).verified).toBe(false);
});

test('rejects altered evidence and fingerprint, even when a receipt was previously valid', () => {
  expect(verify({ expectedFingerprint: 'b'.repeat(64) }).verified).toBe(false);
  const changed = createEvidenceRecord({ ...base, runner: 'changed-runner' });
  expect(verify({ evidence: changed }).verified).toBe(false);
  expect(verify({ evidence: { ...evidence, digest: '0'.repeat(64) } }).verified).toBe(false);
});

test('issuer rejects malformed metadata, wrong key and mismatched digest', () => {
  const issue = overrides => issueExecutionReceipt({
    evidence, runId, issuedAt, privateKey: keys.privateKey, ...overrides
  });
  expect(() => issue({ runId: '../bad' })).toThrow('INVALID_EXECUTION_RECEIPT_METADATA');
  expect(() => issue({ privateKey: keys.publicKey })).toThrow('INVALID_EXECUTION_RECEIPT_KEY');
  expect(() => issue({ evidence: { ...evidence, digest: '0'.repeat(64) } }))
    .toThrow('EXECUTION_EVIDENCE_DIGEST_MISMATCH');
});
