'use strict';
const crypto = require('node:crypto');
const { createEvidenceRecord } = require('./security-evidence-record');

const SHA256 = /^[a-f0-9]{64}$/;

// The public key must come from a separately controlled trust store, not the
// artifact, attestation, or request being verified. This verifier never installs.
function verifyCertificationAttestation({ evidence, attestation, trustedPublicKey, expectedFingerprint }) {
  const fail = reason => ({ verified: false, installable: false, reason });
  if (!trustedPublicKey || !SHA256.test(expectedFingerprint || '')) {
    return fail('TRUST_ANCHOR_REQUIRED');
  }
  let record;
  try {
    record = createEvidenceRecord(evidence);
  } catch {
    return fail('INVALID_CERTIFICATION_EVIDENCE');
  }
  if (!evidence || evidence.digest !== record.digest ||
      record.fingerprint !== expectedFingerprint) {
    return fail('EVIDENCE_INTEGRITY_MISMATCH');
  }
  if (!attestation || attestation.version !== 1 ||
      attestation.fingerprint !== record.fingerprint ||
      attestation.evidenceDigest !== record.digest ||
      attestation.algorithm !== 'ed25519' ||
      typeof attestation.signature !== 'string' ||
      !/^[A-Za-z0-9+/]{86}==$/.test(attestation.signature)) {
    return fail('INVALID_CERTIFICATION_ATTESTATION');
  }
  try {
    const key = crypto.createPublicKey(trustedPublicKey);
    if (key.asymmetricKeyType !== 'ed25519') return fail('UNSUPPORTED_TRUST_KEY');
    const payload = Buffer.from(JSON.stringify({
      version: 1, fingerprint: record.fingerprint, evidenceDigest: record.digest
    }));
    const signature = Buffer.from(attestation.signature, 'base64');
    if (signature.length !== 64 || !crypto.verify(null, payload, key, signature)) {
      return fail('ATTESTATION_SIGNATURE_INVALID');
    }
  } catch {
    return fail('ATTESTATION_SIGNATURE_INVALID');
  }
  return {
    verified: true, installable: false,
    reason: 'ATTESTATION_VERIFIED_INSTALLATION_DISABLED',
    fingerprint: record.fingerprint, evidenceDigest: record.digest
  };
}

module.exports = { verifyCertificationAttestation };
