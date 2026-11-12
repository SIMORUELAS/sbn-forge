'use strict';

const OPERATIONS = Object.freeze(['list', 'read', 'create', 'update', 'delete']);
const REQUIREMENTS = Object.freeze([
  'jwtVerification', 'trustedIdentity', 'operationAuthorization',
  'organizationContext', 'tenantQueryIsolation', 'hostDependencyCompatibility',
  'routeConflictReview', 'migrationReview'
]);

// A design-time contract checklist, NOT an authenticated security attestation.
// A true value is a declaration, not proof that the deployed host enforces it.
function assessPortalModuleSecurityContract({ moduleName, operations, host = {}, evidence = {} } = {}) {
  const validModule = typeof moduleName === 'string' &&
    /^[a-z][a-z0-9_]{2,79}$/.test(moduleName);
  const validOperations = Array.isArray(operations) &&
    operations.length === OPERATIONS.length &&
    new Set(operations).size === OPERATIONS.length &&
    OPERATIONS.every(operation => operations.includes(operation));
  const invalid = [];
  if (!validModule) invalid.push('INVALID_MODULE_NAME');
  if (!validOperations) invalid.push('INVALID_CRUD_OPERATION_SET');
  if (!host || typeof host !== 'object' || Array.isArray(host)) {
    invalid.push('INVALID_HOST_CONTRACT');
  }
  if (!evidence || typeof evidence !== 'object' || Array.isArray(evidence)) {
    invalid.push('INVALID_EVIDENCE_CONTRACT');
  }
  const checks = REQUIREMENTS.map(id => {
    const declared = host && host[id] === true;
    const evidenceItem = evidence && evidence[id];
    const recorded = evidenceItem && typeof evidenceItem === 'object' &&
      !Array.isArray(evidenceItem) &&
      typeof evidenceItem.reference === 'string' &&
      /^[A-Za-z0-9][A-Za-z0-9._/-]{2,79}$/.test(evidenceItem.reference) &&
      !evidenceItem.reference.includes('..') &&
      evidenceItem.reviewed === true;
    return {
      id, state: !declared ? 'HOST_CONTRACT_MISSING' :
        !recorded ? 'EVIDENCE_MISSING' : 'REVIEW_CLAIM_RECORDED'
    };
  });
  const missing = checks.filter(check => check.state !== 'REVIEW_CLAIM_RECORDED')
    .map(check => check.id);
  return {
    status: invalid.length ? 'SECURITY_CONTRACT_BLOCKED'
      : missing.length ? 'SECURITY_CONTRACT_INCOMPLETE'
        : 'SECURITY_DESIGN_READY_FOR_INDEPENDENT_REVIEW',
    moduleName: validModule ? moduleName : null,
    operations: validOperations ? [...OPERATIONS] : [],
    checks, missing, blockers: invalid,
    evidenceIndependentlyVerified: false,
    effectiveJwtEnforcementVerified: false,
    effectivePermissionsVerified: false,
    effectiveTenantIsolationVerified: false,
    integrationTestsExecuted: false,
    installationAuthorized: false,
    publicationAuthorized: false,
    nextStep: 'INDEPENDENT_HOST_INTEGRATION_AND_RUNTIME_SECURITY_TESTS'
  };
}

module.exports = { assessPortalModuleSecurityContract, OPERATIONS, REQUIREMENTS };
