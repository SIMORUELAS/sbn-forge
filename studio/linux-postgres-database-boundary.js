'use strict';

const { assessLinuxIsolation } = require('./linux-postgres-isolation-assessment');

const TARGET = 'sbn_forge_execution_test';
const PROTECTED = Object.freeze(['postgres', 'template0', 'template1', 'sbn_portal_test']);
const REQUIRED = Object.freeze([
  'hostAdministratorApproval', 'privateNetworkRestricted', 'tlsCertificateIdentityVerified',
  'backupRestoreVerified', 'existingDatabasesProtected', 'dedicatedDatabaseApproval',
  'restrictedRunnerApproval', 'resourceIsolationReviewed'
]);

// Pure offline planning. Does not accept connection strings, execute SQL, or grant approval.
function assessForgeDatabaseBoundary({ inventory, context = {}, proposal = {} } = {}) {
  const base = assessLinuxIsolation(inventory, context);
  const database = typeof proposal.databaseName === 'string' ? proposal.databaseName : '';
  const confirmations = proposal.confirmations && typeof proposal.confirmations === 'object' &&
    !Array.isArray(proposal.confirmations) ? proposal.confirmations : {};
  const blockers = [...base.blockers];
  if (database !== TARGET) blockers.push('TARGET_DATABASE_NOT_DEDICATED');
  if (PROTECTED.includes(database)) blockers.push('PROTECTED_DATABASE_TARGET');
  if (proposal.usesAdministrativeRole !== false) blockers.push('ADMINISTRATIVE_ROLE_NOT_EXCLUDED');
  if (proposal.crossDatabaseAccessDisabled !== true) blockers.push('CROSS_DATABASE_ACCESS_NOT_EXCLUDED');
  const missing = REQUIRED.filter(key => confirmations[key] !== true);
  return {
    status: blockers.length ? 'BOUNDARY_REJECTED' : (missing.length || base.unknown.length)
      ? 'BOUNDARY_REVIEW_INCOMPLETE' : 'BOUNDARY_DESIGN_READY_FOR_INDEPENDENT_REVIEW',
    targetDatabase: TARGET,
    protectedDatabases: [...PROTECTED],
    blockers: [...new Set(blockers)],
    missing: [...new Set([...base.unknown, ...missing])],
    databaseProvisioned: false,
    roleProvisioned: false,
    connectionAttempted: false,
    sqlExecuted: false,
    integrationTestsAuthorized: false,
    integrationTestsExecuted: false,
    nextStep: 'SEPARATE_ADMINISTRATOR_APPROVAL_REQUIRED_BEFORE_ANY_PROVISIONING'
  };
}

module.exports = { assessForgeDatabaseBoundary, TARGET, PROTECTED, REQUIRED };
