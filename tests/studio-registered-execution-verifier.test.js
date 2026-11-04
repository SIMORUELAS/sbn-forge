'use strict';
const crypto = require('node:crypto');
const { createEvidenceRecord } = require('../studio/security-evidence-record');
const { issueExecutionReceipt } = require('../studio/execution-provenance-receipt');
const { publicKeyFingerprint, verifyRegisteredExecution } = require('../studio/registered-execution-verifier');

const fingerprint = 'a'.repeat(64);
const evidence = createEvidenceRecord({
  fingerprint, executedAt: '2026-11-04T15:00:00.000Z', runner: 'test-runner',
  tests: {
    postgresqlTenantIsolation: { suite: 'tenant.test.js', status: 'passed', passed: 1, failed: 0 },
    jwtCrudIntegration: { suite: 'jwt.test.js', status: 'passed', passed: 1, failed: 0 }
  }
});
let keys, receipt, registry, replayStore, args;
beforeEach(() => {
  keys = crypto.generateKeyPairSync('ed25519');
  receipt = issueExecutionReceipt({
    evidence, runId: 'run_0123456789abcdef',
    issuedAt: '2026-11-04T15:01:00.000Z', privateKey: keys.privateKey
  });
  registry = { getRunner: jest.fn().mockResolvedValue({
    active: true, publicKey: keys.publicKey, keyFingerprint: publicKeyFingerprint(keys.publicKey)
  }) };
  const seen = new Set();
  replayStore = { claimRunId: jest.fn().mockImplementation(async (runnerId, runId) => {
    const key = runnerId + ':' + runId;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }) };
  args = { evidence, receipt, expectedFingerprint: fingerprint,
    runnerId: 'trusted-runner', registry, replayStore };
});

test('valid registered runner receipt is recorded once, never authorizes installation', async () => {
  const result = await verifyRegisteredExecution(args);
  expect(result).toMatchObject({
    verified: true, registered: true, runnerId: 'trusted-runner',
    installable: false, certificationAuthorized: false
  });
  expect(replayStore.claimRunId).toHaveBeenCalledWith('trusted-runner',
    receipt.runId, expect.objectContaining({ evidenceDigest: evidence.digest }));
  const repeated = await verifyRegisteredExecution(args);
  expect(repeated).toMatchObject({
    verified: false, reason: 'EXECUTION_RECEIPT_REPLAYED_OR_NOT_RECORDED'
  });
});

test('unknown or inactive runner is denied before replay claim', async () => {
  registry.getRunner.mockResolvedValue(null);
  expect((await verifyRegisteredExecution(args)).reason).toBe('RUNNER_NOT_AUTHORIZED');
  registry.getRunner.mockResolvedValue({
    active: false, publicKey: keys.publicKey, keyFingerprint: publicKeyFingerprint(keys.publicKey)
  });
  expect((await verifyRegisteredExecution(args)).verified).toBe(false);
  expect(replayStore.claimRunId).not.toHaveBeenCalled();
});

test('registry key fingerprint mismatch and forged signature are denied', async () => {
  registry.getRunner.mockResolvedValue({
    active: true, publicKey: keys.publicKey, keyFingerprint: 'b'.repeat(64)
  });
  expect((await verifyRegisteredExecution(args)).reason).toBe('RUNNER_TRUST_KEY_MISMATCH');
  registry.getRunner.mockResolvedValue({
    active: true, publicKey: crypto.generateKeyPairSync('ed25519').publicKey,
    keyFingerprint: publicKeyFingerprint(crypto.generateKeyPairSync('ed25519').publicKey)
  });
  expect((await verifyRegisteredExecution(args)).verified).toBe(false);
  expect(replayStore.claimRunId).not.toHaveBeenCalled();
});

test('missing external dependencies and replay store failures fail closed', async () => {
  expect((await verifyRegisteredExecution({ ...args, replayStore: null })).verified).toBe(false);
  replayStore.claimRunId.mockRejectedValue(new Error('storage offline'));
  expect((await verifyRegisteredExecution(args)).reason).toBe('EXECUTION_REPLAY_STORE_UNAVAILABLE');
});

test('tampered receipt or changed artifact cannot claim a run', async () => {
  expect((await verifyRegisteredExecution({
    ...args, expectedFingerprint: 'c'.repeat(64)
  })).verified).toBe(false);
  expect((await verifyRegisteredExecution({
    ...args, receipt: { ...receipt, runId: 'run_ffffffffffffffff' }
  })).verified).toBe(false);
  expect(replayStore.claimRunId).not.toHaveBeenCalled();
});
