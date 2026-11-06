'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const { REQUIRED } = require('./security-certification');

// Read-only diagnostics. Text markers are never evidence of correct runtime
// authorization or tenant isolation, and cannot authorize certification.
async function inspectArtifactSecurity({ artifactRoot, artifacts }) {
  const root = await fs.realpath(artifactRoot);
  if (!Array.isArray(artifacts) || !artifacts.length ||
      artifacts.some(item => typeof item?.path !== 'string' || !item.path.trim()) ||
      new Set(artifacts.map(item => item.path)).size !== artifacts.length) {
    throw new Error('INVALID_INSPECTION_ARTIFACTS');
  }
  const files = new Map();
  for (const item of artifacts) {
    const full = path.resolve(root, item.path);
    if (!full.startsWith(root + path.sep)) { throw new Error('INVALID_INSPECTION_PATH'); }
    const stat = await fs.lstat(full);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 1024 * 1024 ||
        !(await fs.realpath(full)).startsWith(root + path.sep)) {
      throw new Error('INVALID_INSPECTION_FILE');
    }
    if (item.path.endsWith('.js')) files.set(item.path, await fs.readFile(full, 'utf8'));
  }
  const routeFiles = [...files].filter(([name]) => name.endsWith('.routes.js'));
  const repoFiles = [...files].filter(([name]) => name.endsWith('.repository.js'));
  const route = routeFiles.length === 1 ? routeFiles[0][1] : '';
  const repository = repoFiles.length === 1 ? repoFiles[0][1] : '';
  const signals = {
    'generated-host-jwt-contract': /jwt/i.test(route),
    'generated-route-security-exposure': /(?:get|post|patch|delete)/i.test(route),
    'generated-authentication-contract': /(?:jwtVerify|authenticate|authorization)/i.test(route),
    'generated-authorization-contract': /(?:authorizeOperation|requireCrudPermissions)/.test(route),
    'generated-organization-contract': /organizationId|organization_id/.test(route) && /organizationId|organization_id/.test(repository),
    'generated-tenant-query-isolation': /organizationId|organization_id/.test(repository),
    'security-integration-readiness': [...files.keys()].some(name => name.endsWith('jwt-crud.test.js')) &&
      [...files.keys()].some(name => name.endsWith('tenant-postgresql.test.js'))
  };
  return {
    kind: 'artifact-security-static-diagnostics',
    authoritative: false, installable: false,
    observations: REQUIRED.map(check => ({
      check, status: signals[check] ? 'observed' : 'missing'
    })),
    // Never return passed checks from static inspection.
    verifiedChecks: []
  };
}

module.exports = { inspectArtifactSecurity };
