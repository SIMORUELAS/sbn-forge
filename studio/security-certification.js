'use strict';
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');

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
  const paths = artifacts.filter(item => typeof item.path === 'string' &&
    /\.(routes|repository|schema)\.js$/.test(item.path)).map(item => item.path).sort();
  const hashes = {};
  for (const name of paths) {
    const full = path.resolve(root, name);
    if (!full.startsWith(root + path.sep)) {
      return { status: 'blocked', installable: false, reason: 'INVALID_ARTIFACT_PATH' };
    }
    try {
      const stat = await fs.lstat(full);
      if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 128 * 1024) {
        return { status: 'blocked', installable: false, reason: 'INVALID_ARTIFACT' };
      }
      hashes[name] = crypto.createHash('sha256').update(await fs.readFile(full)).digest('hex');
    } catch {
      return { status: 'blocked', installable: false, reason: 'UNREADABLE_ARTIFACT' };
    }
  }
  const fingerprint = crypto.createHash('sha256').update(JSON.stringify(hashes)).digest('hex');
  const required = REQUIRED.map(check => {
    const found = checks.find(item => item.check === check);
    return { check, status: found?.status || 'missing' };
  });
  const allPassed = required.every(item => item.status === 'passed');
  const evidenceMatches = Boolean(evidence && evidence.fingerprint === fingerprint &&
    evidence.postgresqlTenantIsolation === 'passed' &&
    evidence.jwtCrudIntegration === 'passed');
  // Test runs against the generic generator are not evidence for a particular generated artifact.
  // Installation remains disabled until trusted per-artifact verification is implemented.
  return {
    status: allPassed && evidenceMatches ? 'review-required' : 'blocked',
    installable: false,
    fingerprint,
    required,
    evidenceMatches,
    reason: allPassed && evidenceMatches ? 'TRUSTED_CERTIFICATION_NOT_IMPLEMENTED' : 'SECURITY_EVIDENCE_INCOMPLETE'
  };
}
module.exports = { assessSecurityCertification, REQUIRED };
