'use strict';
const crypto = require('node:crypto');
const { createEvidenceRecord } = require('../studio/security-evidence-record');
const { issueCertificationAttestation, verifyIssuedCertification } =
  require('../studio/certification-attestation-issuer');

const fingerprint = 'a'.repeat(64);
const evidence = createEvidenceRecord({
  fingerprint, executedAt: '2026-11-03T12:00:00.000Z',
  runner: 'offline-certification-test',
  tests: {
    postgresqlTenantIsolation: { suite: 'tenant.test.js', status: 'passed', passed: 2, failed: 0 },
    jwtCrudIntegration: { suite: 'jwt.test.js', status: 'passed', passed: 1, failed: 0 }
  }
});

test('external Ed25519 signer produces verifiable attestation without installation authority', () => {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');
  const signed = issueCertificationAttestation({ evidence, expectedFingerprint: fingerprint, privateKey });
  expect(signed.installable).toBe(false);
  expect(signed.published).toBe(false);
  expect(verifyIssuedCertification({
    evidence, attestation: signed.attestation, trustedPublicKey: publicKey,
    expectedFingerprint: fingerprint
  })).toMatchObject({ verified: true, installable: false });
});

test('issuer rejects missing key, modified digest, wrong artifact and unsupported key type', () => {
  const { privateKey } = crypto.generateKeyPairSync('ed25519');
  const rsa = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const base = { evidence, expectedFingerprint: fingerprint, privateKey };
  expect(() => issueCertificationAttestation({ ...base, privateKey: undefined }))
    .toThrow('CERTIFICATION_SIGNING_KEY_REQUIRED');
  expect(() => issueCertificationAttestation({ ...base, evidence: { ...evidence, digest: '0'.repeat(64) } }))
    .toThrow('CERTIFICATION_EVIDENCE_INTEGRITY_REQUIRED');
  expect(() => issueCertificationAttestation({ ...base, expectedFingerprint: 'b'.repeat(64) }))
    .toThrow('CERTIFICATION_EVIDENCE_INTEGRITY_REQUIRED');
  expect(() => issueCertificationAttestation({ ...base, privateKey: rsa.privateKey }))
    .toThrow('UNSUPPORTED_CERTIFICATION_SIGNING_KEY');
});

test('signed evidence cannot be reused for a modified artifact or different trusted authority', () => {
  const signer = crypto.generateKeyPairSync('ed25519');
  const other = crypto.generateKeyPairSync('ed25519');
  const signed = issueCertificationAttestation({
    evidence, expectedFingerprint: fingerprint, privateKey: signer.privateKey
  });
  for (const props of [
    { trustedPublicKey: other.publicKey, expectedFingerprint: fingerprint },
    { trustedPublicKey: signer.publicKey, expectedFingerprint: 'b'.repeat(64) }
  ]) {
    const result = verifyIssuedCertification({ evidence, attestation: signed.attestation, ...props });
    expect(result.verified).toBe(false);
    expect(result.installable).toBe(false);
  }
});
