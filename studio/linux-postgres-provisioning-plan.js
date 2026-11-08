'use strict';

const { assessForgeDatabaseBoundary, TARGET } = require('./linux-postgres-database-boundary');

const PHASES = Object.freeze([
  'ADMINISTRATOR_VERIFY_NETWORK_TLS_AND_BACKUPS',
  'ADMINISTRATOR_APPROVE_DEDICATED_DATABASE_AND_ROLE',
  'INDEPENDENTLY_REVIEW_LEAST_PRIVILEGE_AND_RESOURCE_LIMITS',
  'DOCUMENT_RESTORE_AND_ROLLBACK_OWNERSHIP',
  'SEPARATE_CHANGE_WINDOW_AND_EXPLICIT_EXECUTION_AUTHORIZATION'
]);
const ROLLBACK = Object.freeze([
  'STOP_AND_DISABLE_TEST_RUNNER',
  'REVOKE_TEST_RUNNER_ACCESS_AFTER_ADMINISTRATOR_REVIEW',
  'PRESERVE_AUDIT_AND_EVIDENCE',
  'RESTORE_ONLY_FROM_VERIFIED_BACKUP_IF_INDEPENDENTLY_AUTHORIZED',
  'NEVER_DROP_OR_MODIFY_EXISTING_PORTAL_DATABASES'
]);

// Offline procedural design only: does not generate SQL, credentials, or executable commands.
function planForgeProvisioning({ inventory, context = {}, proposal = {} } = {}) {
  const boundary = assessForgeDatabaseBoundary({ inventory, context, proposal });
  return {
    status: boundary.status === 'BOUNDARY_DESIGN_READY_FOR_INDEPENDENT_REVIEW'
      ? 'PROCEDURE_READY_FOR_ADMINISTRATOR_REVIEW' : 'PROCEDURE_BLOCKED',
    targetDatabase: TARGET,
    protectedDatabases: [...boundary.protectedDatabases],
    boundaryStatus: boundary.status,
    blockers: [...boundary.blockers],
    missing: [...boundary.missing],
    phases: [...PHASES],
    identities: {
      inspection: 'RESTRICTED_READ_ONLY_NO_CREATE',
      provisioning: 'SEPARATE_ADMINISTRATOR_APPROVAL_REQUIRED',
      execution: 'DEDICATED_NON_SUPERUSER_LIMITED_TO_TEST_DATABASE'
    },
    rollback: [...ROLLBACK],
    databaseProvisioned: false,
    roleProvisioned: false,
    connectionAttempted: false,
    sqlGenerated: false,
    sqlExecuted: false,
    authorizationMarkerEnabled: false,
    integrationTestsAuthorized: false,
    nextStep: 'INDEPENDENT_SECURITY_AND_RECOVERY_APPROVAL'
  };
}

module.exports = { planForgeProvisioning, PHASES, ROLLBACK };
