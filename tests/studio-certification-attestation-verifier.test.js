'use strict';
const crypto = require('node:crypto');
const { verifyCertificationAttestation } = require('../studio/certification-attestation-verifier');
const { createEvidenceRecord } = require('../studio/security-evidence-record');

const fingerprint = 'a'.repeat(64);
function fixture() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  const evidence = createEvidenceRecord({
    fingerprint, executedAt: '2026-11-03T12:00:00.000Z', runner: 'test-runner',
    tests: {
      postgresqlTenantIsolation: { suite: 'tenant.test.js', status: 'passed', passed: 2, failed: 0 },
      jwtCrudIntegration: { suite: 'jwt.test.js', status: 'passed', passed: 1, failed: 0 }
    }
  });
  const payload = Buffer.from(JSON.stringify({
    version: 1, fingerprint, evidenceDigest: evidence.digest
  }));
  const attestation = {
    version: 1, algorithm: 'ed25519', fingerprint,
    evidenceDigest: evidence.digest,
    signature: crypto.sign(null, payload, privateKey).toString('base64')
  };
  return { evidence, attestation, trustedPublicKey: publicKey.export({ type: 'spki', format: 'pem' }) };
}

test('verifies an externally anchored signature but never grants installation', () => {
  const data = fixture();
  expect(verifyCertificationAttestation({ ...data, expectedFingerprint: fingerprint }))
    .toMatchObject({ verified: true, installable: false, reason: 'ATTESTATION_VERIFIED_INSTALLATION_DISABLED' });
});

test('rejects forged, tampered and mismatched attestations', () => {
  const data = fixture();
  const other = fixture();
  const scenarios = [
    { ...data, trustedPublicKey: other.trustedPublicKey },
    { ...data, trustedPublicKey: undefined },
    { ...data, expectedFingerprint: 'b'.repeat(64) },
    { ...data, evidence: { ...data.evidence, digest: '0'.repeat(64) } },
    { ...data, evidence: { ...data.evidence, tests: { ...data.evidence.tests,
      jwtCrudIntegration: { ...data.evidence.tests.jwtCrudIntegration, passed: 999 } } } },
    { ...data, attestation: { ...data.attestation, evidenceDigest: 'b'.repeat(64) } },
    { ...data, attestation: { ...data.attestation, signature: 'A'.repeat(86) + '==' } },
    { ...data, attestation: { ...data.attestation, algorithm: 'rsa' } }
  ];
  for (const scenario of scenarios) {
    const result = verifyCertificationAttestation({ ...scenario, expectedFingerprint: scenario.expectedFingerprint || fingerprint });
    expect(result.verified).toBe(false);
    expect(result.installable).toBe(false);
  }
});

test('accepts a public KeyObject trust anchor but rejects private KeyObjects and RSA keys', () => {
  const data = fixture();
  const publicKey = crypto.createPublicKey(data.trustedPublicKey);
  expect(verifyCertificationAttestation({
    ...data, trustedPublicKey: publicKey, expectedFingerprint: fingerprint
  })).toMatchObject({ verified: true, installable: false });
  const privateKey = crypto.generateKeyPairSync('ed25519').privateKey;
  expect(verifyCertificationAttestation({
    ...data, trustedPublicKey: privateKey, expectedFingerprint: fingerprint
  })).toMatchObject({ verified: false, installable: false, reason: 'INVALID_TRUST_KEY_TYPE' });
  const rsaPublicKey = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 }).publicKey;
  expect(verifyCertificationAttestation({
    ...data, trustedPublicKey: rsaPublicKey, expectedFingerprint: fingerprint
  })).toMatchObject({ verified: false, installable: false, reason: 'UNSUPPORTED_TRUST_KEY' });
});
