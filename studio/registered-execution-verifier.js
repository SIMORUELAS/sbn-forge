'use strict';
const crypto = require('node:crypto');
const { verifyExecutionReceipt } = require('./execution-provenance-receipt');

function publicKeyFingerprint(key) {
  const publicKey = key instanceof crypto.KeyObject ? key : crypto.createPublicKey(key);
  if (publicKey.type !== 'public' || publicKey.asymmetricKeyType !== 'ed25519') {
    throw new Error('INVALID_RUNNER_TRUST_KEY');
  }
  return crypto.createHash('sha256').update(publicKey.export({ type: 'spki', format: 'der' })).digest('hex');
}

// Registry is owned by an external authority; never read runner identity from
// the artifact or receipt. claimRunId must be atomic and durable in production.
async function verifyRegisteredExecution({
  evidence, receipt, expectedFingerprint, runnerId, registry, replayStore
}) {
  const fail = reason => ({
    verified: false, registered: false, installable: false,
    certificationAuthorized: false, reason
  });
  if (typeof runnerId !== 'string' || !/^[a-zA-Z0-9_-]{3,128}$/.test(runnerId) ||
      !registry || typeof registry.getRunner !== 'function' ||
      !replayStore || typeof replayStore.claimRunId !== 'function') {
    return fail('EXTERNAL_RUNNER_REGISTRY_AND_REPLAY_STORE_REQUIRED');
  }
  let runner;
  try { runner = await registry.getRunner(runnerId); }
  catch { return fail('RUNNER_REGISTRY_UNAVAILABLE'); }
  if (!runner || runner.active !== true || !runner.publicKey ||
      typeof runner.keyFingerprint !== 'string') {
    return fail('RUNNER_NOT_AUTHORIZED');
  }
  let keyFingerprint;
  try { keyFingerprint = publicKeyFingerprint(runner.publicKey); }
  catch { return fail('RUNNER_TRUST_KEY_INVALID'); }
  if (keyFingerprint !== runner.keyFingerprint) {
    return fail('RUNNER_TRUST_KEY_MISMATCH');
  }
  const verification = verifyExecutionReceipt({
    evidence, receipt, trustedRunnerPublicKey: runner.publicKey, expectedFingerprint
  });
  if (!verification.verified) { return fail(verification.reason); }
  let claimed;
  try {
    claimed = await replayStore.claimRunId(runnerId, verification.runId, {
      fingerprint: verification.fingerprint, evidenceDigest: verification.evidenceDigest,
      issuedAt: verification.issuedAt
    });
  } catch { return fail('EXECUTION_REPLAY_STORE_UNAVAILABLE'); }
  if (claimed !== true) { return fail('EXECUTION_RECEIPT_REPLAYED_OR_NOT_RECORDED'); }
  return {
    verified: true, registered: true, runnerId, runId: verification.runId,
    keyFingerprint, fingerprint: verification.fingerprint,
    evidenceDigest: verification.evidenceDigest, issuedAt: verification.issuedAt,
    certificationAuthorized: false, installable: false,
    reason: 'REGISTERED_EXECUTION_NOT_SECURITY_CERTIFICATION'
  };
}

module.exports = { publicKeyFingerprint, verifyRegisteredExecution };
