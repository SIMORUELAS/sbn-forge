'use strict';
const crypto = require('node:crypto');
const { createEvidenceRecord } = require('./security-evidence-record');
const { verifyCertificationAttestation } = require('./certification-attestation-verifier');

// Offline signing primitive. The private key MUST be supplied by an external,
// separately authorized signer; it must never live in generated artifacts.
// This function does not establish who approved the checks or grant installation.
function issueCertificationAttestation({ evidence, expectedFingerprint, privateKey }) {
  if (!privateKey) { throw new Error('CERTIFICATION_SIGNING_KEY_REQUIRED'); }
  const record = createEvidenceRecord(evidence);
  if (!evidence || evidence.digest !== record.digest ||
      record.fingerprint !== expectedFingerprint) {
    throw new Error('CERTIFICATION_EVIDENCE_INTEGRITY_REQUIRED');
  }
  let key;
  try {
    key = privateKey instanceof crypto.KeyObject ? privateKey : crypto.createPrivateKey(privateKey);
  } catch {
    throw new Error('INVALID_CERTIFICATION_SIGNING_KEY');
  }
  if (key.type !== 'private') {
    throw new Error('INVALID_CERTIFICATION_SIGNING_KEY');
  }
  if (key.asymmetricKeyType !== 'ed25519') {
    throw new Error('UNSUPPORTED_CERTIFICATION_SIGNING_KEY');
  }
  const payload = Buffer.from(JSON.stringify({
    version: 1, fingerprint: record.fingerprint, evidenceDigest: record.digest
  }));
  const attestation = {
    version: 1, algorithm: 'ed25519',
    fingerprint: record.fingerprint, evidenceDigest: record.digest,
    signature: crypto.sign(null, payload, key).toString('base64')
  };
  // No trust decision is made by the issuer itself. Verify against an external
  // trusted public key and a freshly computed artifact fingerprint.
  return { attestation, installable: false, published: false };
}

function verifyIssuedCertification({ evidence, attestation, trustedPublicKey, expectedFingerprint }) {
  return verifyCertificationAttestation({
    evidence, attestation, trustedPublicKey, expectedFingerprint
  });
}

module.exports = { issueCertificationAttestation, verifyIssuedCertification };
