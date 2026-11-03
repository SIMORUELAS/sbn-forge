'use strict';
const { assessSecurityCertification, REQUIRED } = require('./security-certification');
const { verifyCertificationAttestation } = require('./certification-attestation-verifier');

// This is a diagnostic policy, NOT an authorization or installation decision.
// Caller-provided checks are claims until independently audited and bound to
// a trusted execution identity. A valid signature alone is insufficient.
async function evaluateCertificationTrust({
  artifactRoot, artifacts, checks, evidence, attestation, trustedPublicKey
}) {
  const assessment = await assessSecurityCertification(artifactRoot, artifacts, checks, evidence);
  const verification = assessment.fingerprint
    ? verifyCertificationAttestation({
      evidence, attestation, trustedPublicKey,
      expectedFingerprint: assessment.fingerprint
    })
    : { verified: false, installable: false, reason: 'ARTIFACT_FINGERPRINT_REQUIRED' };
  const checksComplete = Array.isArray(assessment.required) &&
    assessment.required.length === REQUIRED.length &&
    assessment.required.every(item => item.status === 'passed');
  const integrityVerified = assessment.evidenceMatches === true;
  const signatureVerified = verification.verified === true;
  const evidenceAuthentic = integrityVerified && signatureVerified;
  return {
    kind: 'studio-certification-trust-assessment',
    status: 'blocked',
    installable: false,
    published: false,
    fingerprint: assessment.fingerprint || null,
    checksComplete,
    checksTrust: 'unverified',
    integrityVerified,
    signatureVerified,
    evidenceAuthentic,
    certificationAuthorized: false,
    reason: !integrityVerified ? 'ARTIFACT_EVIDENCE_NOT_VERIFIED'
      : !signatureVerified ? 'ATTESTATION_NOT_VERIFIED'
      : !checksComplete ? 'SECURITY_CHECKS_INCOMPLETE'
      : 'INDEPENDENT_CHECK_AUTHORITY_REQUIRED',
    verificationReason: verification.reason,
    required: assessment.required || []
  };
}

module.exports = { evaluateCertificationTrust };
