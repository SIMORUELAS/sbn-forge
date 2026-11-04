'use strict';
const crypto = require('node:crypto');
const { executeSecurityEvidence } = require('./security-evidence-executor');
const { assessSecurityCertification } = require('./security-certification');
const { issueExecutionReceipt, verifyExecutionReceipt } = require('./execution-provenance-receipt');

// Invoked only by an external, controlled runner. Keys are supplied at runtime,
// never read from the artifact, persisted, or returned. This is not certification.
async function runControlledSecurityEvidence({
  repoRoot, artifactRoot, artifacts, checks, databaseUrl, suitePaths,
  timeoutMs, runnerPrivateKey, trustedRunnerPublicKey
}) {
  if (!runnerPrivateKey || !trustedRunnerPublicKey) {
    throw new Error('EXTERNAL_RUNNER_KEYS_REQUIRED');
  }
  const evidence = await executeSecurityEvidence({
    repoRoot, artifactRoot, artifacts, checks, databaseUrl, suitePaths, timeoutMs
  });
  const assessment = await assessSecurityCertification(artifactRoot, artifacts, checks, evidence);
  if (!assessment.fingerprint || assessment.fingerprint !== evidence.fingerprint ||
      assessment.evidenceMatches !== true) {
    throw new Error('RUNNER_ARTIFACT_EVIDENCE_MISMATCH');
  }
  const runId = 'run_' + crypto.randomBytes(16).toString('hex');
  const receipt = issueExecutionReceipt({
    evidence, runId, issuedAt: new Date().toISOString(), privateKey: runnerPrivateKey
  });
  const provenance = verifyExecutionReceipt({
    evidence, receipt, trustedRunnerPublicKey, expectedFingerprint: assessment.fingerprint
  });
  if (!provenance.verified) {
    throw new Error('RUNNER_RECEIPT_VERIFICATION_FAILED: ' + provenance.reason);
  }
  return {
    kind: 'controlled-security-evidence-run',
    evidence, receipt, provenance,
    fingerprint: assessment.fingerprint,
    certificationAuthorized: false, installable: false,
    published: false, databaseModified: false,
    reason: 'INDEPENDENT_SECURITY_CERTIFICATION_REQUIRED'
  };
}

module.exports = { runControlledSecurityEvidence };
