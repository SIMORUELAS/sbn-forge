'use strict';
const { prepareArtifactIntegrationSuites } = require('./artifact-integration-suites');
const { executeSecurityEvidence } = require('./security-evidence-executor');
const { assessSecurityCertification } = require('./security-certification');
const { verifyExecutionReceipt } = require('./execution-provenance-receipt');

// Explicit opt-in: never invoked automatically during generation or installation.
async function evaluateIsolatedArtifactSecurity({ run, definition, repoRoot, databaseUrl, checks, timeoutMs, executionReceipt, trustedRunnerPublicKey }) {
  if (!run || run.mode !== 'isolated-local' || run.published !== false ||
      run.databaseModified !== false || !repoRoot || !databaseUrl) {
    throw new Error('ISOLATED_SECURITY_WORKFLOW_REQUIRED');
  }
  const prepared = await prepareArtifactIntegrationSuites(run, definition);
  const evidence = await executeSecurityEvidence({
    repoRoot, artifactRoot: run.directory, artifacts: prepared.artifacts,
    suitePaths: prepared.suitePaths, databaseUrl, checks, timeoutMs
  });
  const assessment = await assessSecurityCertification(run.directory, prepared.artifacts, checks, evidence);
  const provenance = executionReceipt && trustedRunnerPublicKey
    ? verifyExecutionReceipt({ evidence, receipt: executionReceipt,
      trustedRunnerPublicKey, expectedFingerprint: assessment.fingerprint })
    : { verified: false, installable: false, reason: 'TRUSTED_EXECUTION_RECEIPT_REQUIRED' };
  return {
    kind: 'isolated-artifact-security-evaluation',
    provenance,
    certificationAuthorized: false,
    suitePaths: prepared.suitePaths,
    artifacts: prepared.artifacts,
    evidence,
    assessment,
    installable: false,
    published: false,
    databaseModified: false
  };
}

module.exports = { evaluateIsolatedArtifactSecurity };
