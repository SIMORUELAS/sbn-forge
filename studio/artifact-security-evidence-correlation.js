'use strict';
const { inspectArtifactSecurity } = require('./artifact-security-inspector');
const { assessSecurityCertification } = require('./security-certification');
const { createEvidenceRecord } = require('./security-evidence-record');

// Combines independently read source observations with the supplied Jest
// execution record. This is diagnostic only: neither static markers nor
// untrusted runner reports can grant certification or installation.
async function correlateArtifactSecurityEvidence({
  artifactRoot, artifacts, checks, evidence
}) {
  const inspection = await inspectArtifactSecurity({ artifactRoot, artifacts });
  const assessment = await assessSecurityCertification(artifactRoot, artifacts, checks, evidence);
  let execution = { status: 'unverified', reason: 'EXECUTION_EVIDENCE_MISSING' };
  try {
    const normalized = createEvidenceRecord(evidence);
    if (evidence.digest !== normalized.digest) {
      execution = { status: 'unverified', reason: 'EXECUTION_DIGEST_MISMATCH' };
    } else if (!assessment.fingerprint || normalized.fingerprint !== assessment.fingerprint) {
      execution = { status: 'unverified', reason: 'EXECUTION_ARTIFACT_MISMATCH' };
    } else {
      execution = {
        status: 'reported',
        reason: 'EXECUTION_PROVENANCE_UNVERIFIED',
        digest: normalized.digest,
        tests: normalized.tests
      };
    }
  } catch {
    execution = { status: 'unverified', reason: 'EXECUTION_EVIDENCE_INVALID' };
  }
  return {
    kind: 'artifact-security-evidence-correlation',
    fingerprint: assessment.fingerprint || null,
    inspection,
    execution,
    declaredChecks: assessment.required || [],
    independentlyVerifiedChecks: [],
    certificationAuthorized: false,
    status: 'blocked',
    installable: false,
    published: false,
    reason: 'INDEPENDENT_EXECUTION_AUTHORITY_REQUIRED'
  };
}

module.exports = { correlateArtifactSecurityEvidence };
