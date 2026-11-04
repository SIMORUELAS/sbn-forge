'use strict';
const crypto = require('node:crypto');
const { createEvidenceRecord } = require('./security-evidence-record');

// A separate runner may sign a receipt for a completed execution. This is
// provenance authentication, not proof of independent security review.
function receiptPayload(record, runId, issuedAt) {
  return Buffer.from(JSON.stringify({
    version: 1, purpose: 'sbn-forge-execution-receipt',
    runId, issuedAt, fingerprint: record.fingerprint,
    evidenceDigest: record.digest
  }));
}

function issueExecutionReceipt({ evidence, runId, issuedAt, privateKey }) {
  const record = createEvidenceRecord(evidence);
  if (record.digest !== evidence?.digest) throw new Error('EXECUTION_EVIDENCE_DIGEST_MISMATCH');
  if (typeof runId !== 'string' || !/^[a-zA-Z0-9_-]{16,128}$/.test(runId) ||
      typeof issuedAt !== 'string' || !Number.isFinite(Date.parse(issuedAt))) {
    throw new Error('INVALID_EXECUTION_RECEIPT_METADATA');
  }
  let key;
  try {
    key = privateKey instanceof crypto.KeyObject ? privateKey : crypto.createPrivateKey(privateKey);
  } catch {
    throw new Error('INVALID_EXECUTION_RECEIPT_KEY');
  }
  if (key.type !== 'private' || key.asymmetricKeyType !== 'ed25519') {
    throw new Error('INVALID_EXECUTION_RECEIPT_KEY');
  }
  return {
    version: 1, purpose: 'sbn-forge-execution-receipt', algorithm: 'ed25519',
    runId, issuedAt, fingerprint: record.fingerprint, evidenceDigest: record.digest,
    signature: crypto.sign(null, receiptPayload(record, runId, issuedAt), key).toString('base64')
  };
}

function verifyExecutionReceipt({ evidence, receipt, trustedRunnerPublicKey, expectedFingerprint }) {
  const fail = reason => ({ verified: false, installable: false, reason });
  let record;
  try { record = createEvidenceRecord(evidence); } catch { return fail('INVALID_EXECUTION_EVIDENCE'); }
  if (record.digest !== evidence?.digest || record.fingerprint !== expectedFingerprint) {
    return fail('EXECUTION_EVIDENCE_INTEGRITY_MISMATCH');
  }
  if (!receipt || receipt.version !== 1 || receipt.purpose !== 'sbn-forge-execution-receipt' ||
      receipt.algorithm !== 'ed25519' || receipt.fingerprint !== record.fingerprint ||
      receipt.evidenceDigest !== record.digest ||
      typeof receipt.runId !== 'string' || !/^[a-zA-Z0-9_-]{16,128}$/.test(receipt.runId) ||
      typeof receipt.issuedAt !== 'string' || !Number.isFinite(Date.parse(receipt.issuedAt)) ||
      typeof receipt.signature !== 'string' || !/^[A-Za-z0-9+/]{86}==$/.test(receipt.signature)) {
    return fail('INVALID_EXECUTION_RECEIPT');
  }
  let key;
  try {
    key = trustedRunnerPublicKey instanceof crypto.KeyObject
      ? trustedRunnerPublicKey : crypto.createPublicKey(trustedRunnerPublicKey);
    if (key.type !== 'public' || key.asymmetricKeyType !== 'ed25519') {
      return fail('INVALID_TRUSTED_RUNNER_KEY');
    }
    const signature = Buffer.from(receipt.signature, 'base64');
    if (signature.length !== 64 ||
        !crypto.verify(null, receiptPayload(record, receipt.runId, receipt.issuedAt), key, signature)) {
      return fail('EXECUTION_RECEIPT_SIGNATURE_INVALID');
    }
  } catch { return fail('EXECUTION_RECEIPT_SIGNATURE_INVALID'); }
  return {
    verified: true, installable: false, reason: 'EXECUTION_RECEIPT_VERIFIED_NOT_CERTIFIED',
    fingerprint: record.fingerprint, evidenceDigest: record.digest,
    runId: receipt.runId, issuedAt: receipt.issuedAt
  };
}

module.exports = { issueExecutionReceipt, verifyExecutionReceipt };
