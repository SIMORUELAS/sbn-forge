'use strict';
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { assessSecurityCertification, REQUIRED } = require('../studio/security-certification');
const { createEvidenceRecord } = require('../studio/security-evidence-record');
const { issueCertificationAttestation } = require('../studio/certification-attestation-issuer');
const { evaluateCertificationTrust } = require('../studio/certification-trust-policy');

let root;
let artifacts;
let checks;
let evidence;
let attestation;
let trustedPublicKey;

beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-trust-policy-'));
  await fs.writeFile(path.join(root, 'module.js'), 'module.exports = {};');
  artifacts = [{ path: 'module.js' }];
  checks = REQUIRED.map(check => ({ check, status: 'passed' }));
  const assessment = await assessSecurityCertification(root, artifacts, checks);
  evidence = createEvidenceRecord({
    fingerprint: assessment.fingerprint,
    executedAt: '2026-11-03T12:00:00.000Z', runner: 'self-claimed-runner',
    tests: {
      postgresqlTenantIsolation: { suite: 'tenant.test.js', status: 'passed', passed: 2, failed: 0 },
      jwtCrudIntegration: { suite: 'jwt.test.js', status: 'passed', passed: 2, failed: 0 }
    }
  });
  const keys = crypto.generateKeyPairSync('ed25519');
  trustedPublicKey = keys.publicKey;
  attestation = issueCertificationAttestation({
    evidence, expectedFingerprint: assessment.fingerprint, privateKey: keys.privateKey
  }).attestation;
});
afterEach(async () => { await fs.rm(root, { recursive: true, force: true }); });

test('valid signed evidence is authentic but cannot self-certify or install', async () => {
  const result = await evaluateCertificationTrust({
    artifactRoot: root, artifacts, checks, evidence, attestation, trustedPublicKey
  });
  expect(result).toMatchObject({
    status: 'blocked', installable: false, published: false,
    integrityVerified: true, signatureVerified: true, evidenceAuthentic: true,
    checksComplete: true, checksTrust: 'unverified',
    certificationAuthorized: false, reason: 'INDEPENDENT_CHECK_AUTHORITY_REQUIRED'
  });
});

test('rejects altered artifact, forged signature and self-declared incomplete checks', async () => {
  const base = { artifactRoot: root, artifacts, checks, evidence, attestation, trustedPublicKey };
  await fs.writeFile(path.join(root, 'module.js'), 'module.exports = { changed: true };');
  const changed = await evaluateCertificationTrust(base);
  expect(changed).toMatchObject({
    integrityVerified: false, certificationAuthorized: false, installable: false,
    reason: 'ARTIFACT_EVIDENCE_NOT_VERIFIED'
  });
  await fs.writeFile(path.join(root, 'module.js'), 'module.exports = {};');
  const wrongKey = crypto.generateKeyPairSync('ed25519').publicKey;
  const forged = await evaluateCertificationTrust({ ...base, trustedPublicKey: wrongKey });
  expect(forged).toMatchObject({
    signatureVerified: false, certificationAuthorized: false,
    reason: 'ATTESTATION_NOT_VERIFIED'
  });
  const incomplete = await evaluateCertificationTrust({ ...base, checks: [] });
  expect(incomplete).toMatchObject({
    evidenceAuthentic: true, checksComplete: false,
    certificationAuthorized: false, reason: 'SECURITY_CHECKS_INCOMPLETE'
  });
});

test('missing artifact or missing attestation always fails closed', async () => {
  const base = { artifactRoot: root, artifacts, checks, evidence, attestation, trustedPublicKey };
  const noSignature = await evaluateCertificationTrust({ ...base, attestation: null });
  expect(noSignature.signatureVerified).toBe(false);
  expect(noSignature.installable).toBe(false);
  const missingArtifact = await evaluateCertificationTrust({ ...base, artifacts: [] });
  expect(missingArtifact).toMatchObject({
    status: 'blocked', installable: false, certificationAuthorized: false,
    reason: 'ARTIFACT_EVIDENCE_NOT_VERIFIED'
  });
});
