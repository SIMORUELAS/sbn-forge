'use strict';
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const { createEvidenceRecord } = require('./security-evidence-record');

const REQUIRED = Object.freeze([
  'generated-host-jwt-contract',
  'generated-route-security-exposure',
  'generated-authentication-contract',
  'generated-authorization-contract',
  'generated-organization-contract',
  'generated-tenant-query-isolation',
  'security-integration-readiness'
]);

async function assessSecurityCertification(directory, artifacts, checks, evidence = null) {
  const root = path.resolve(directory);
  if (!Array.isArray(artifacts) || artifacts.some(item => !item || typeof item.path !== 'string' || !item.path.trim())) {
    return { status: 'blocked', installable: false, reason: 'INVALID_ARTIFACT_SET' };
  }
  const paths = artifacts.map(item => item.path).sort();
  if (!paths.length || new Set(paths).size !== paths.length) {
    return { status: 'blocked', installable: false, reason: 'INVALID_ARTIFACT_SET' };
  }
  const hashes = {};
  for (const name of paths) {
    const full = path.resolve(root, name);
    if (!full.startsWith(root + path.sep)) {
      return { status: 'blocked', installable: false, reason: 'INVALID_ARTIFACT_PATH' };
    }
    try {
      const stat = await fs.lstat(full);
      if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 1024 * 1024) {
        return { status: 'blocked', installable: false, reason: 'INVALID_ARTIFACT' };
      }
      const canonicalRoot = await fs.realpath(root);
      const canonicalFile = await fs.realpath(full);
      if (!canonicalFile.startsWith(canonicalRoot + path.sep)) {
        return { status: 'blocked', installable: false, reason: 'INVALID_ARTIFACT_PATH' };
      }
      hashes[name] = crypto.createHash('sha256').update(await fs.readFile(full)).digest('hex');
    } catch {
      return { status: 'blocked', installable: false, reason: 'UNREADABLE_ARTIFACT' };
    }
  }
  const fingerprint = crypto.createHash('sha256').update(JSON.stringify(hashes)).digest('hex');
  const validChecks = Array.isArray(checks) && checks.every(item => item && typeof item.check === 'string' && typeof item.status === 'string') && new Set(checks.map(item => item.check)).size === checks.length;
  const required = REQUIRED.map(check => {
    const found = validChecks ? checks.find(item => item.check === check) : null;
    return { check, status: found?.status || 'missing' };
  });
  const allPassed = required.every(item => item.status === 'passed');
  let evidenceRecord = null;
  try {
    if (evidence?.tests) {
      evidenceRecord = createEvidenceRecord(evidence);
      // A supplied digest is a claim about the original record; never silently
      // replace a mismatched digest with a freshly computed one.
      if (Object.prototype.hasOwnProperty.call(evidence, 'digest') &&
          evidence.digest !== evidenceRecord.digest) {
        evidenceRecord = null;
      }
    }
  } catch {
    evidenceRecord = null;
  }
  const evidenceMatches = Boolean(evidenceRecord && evidenceRecord.fingerprint === fingerprint);
  // Test runs against the generic generator are not evidence for a particular generated artifact.
  // Installation remains disabled until trusted per-artifact verification is implemented.
  return {
    status: allPassed && evidenceMatches ? 'review-required' : 'blocked',
    installable: false,
    fingerprint,
    required,
    evidenceMatches,
    evidence: evidenceRecord ? { digest: evidenceRecord.digest, trust: evidenceRecord.trust, executedAt: evidenceRecord.executedAt, runner: evidenceRecord.runner, tests: evidenceRecord.tests } : null,
    reason: allPassed && evidenceMatches ? 'TRUSTED_CERTIFICATION_NOT_IMPLEMENTED' : 'SECURITY_EVIDENCE_INCOMPLETE'
  };
}
module.exports = { assessSecurityCertification, REQUIRED };
