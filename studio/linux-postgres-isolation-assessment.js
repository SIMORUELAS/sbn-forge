'use strict';

// Offline policy assessment only. It never connects to PostgreSQL or authorizes tests.
function assessLinuxIsolation(inventory, context = {}) {
  if (!inventory || inventory.status !== 'READ_ONLY_INVENTORY_COMPLETE' ||
      inventory.suitableForForgeIntegration !== false ||
      inventory.integrationTestsExecuted !== false) {
    throw new Error('VALID_READ_ONLY_INVENTORY_REQUIRED');
  }
  const blockers = [];
  const unknown = [];
  if (inventory.sslActive !== true) { blockers.push('TLS_NOT_VERIFIED'); }
  if (inventory.privilegedRole !== false || inventory.databaseOwnerMember !== false) {
    blockers.push('INSPECTION_ROLE_NOT_RESTRICTED');
  }
  if (inventory.canCreateSchema !== false || inventory.publicCreate !== false) {
    blockers.push('INSPECTION_ROLE_HAS_CREATE_PRIVILEGES');
  }
  if (inventory.publicUsage !== true) { unknown.push('INSPECTION_PUBLIC_SCHEMA_ACCESS_UNCONFIRMED'); }
  if (context.nonProductionConfirmed !== true) { unknown.push('NON_PRODUCTION_STATUS_NOT_CONFIRMED'); }
  if (context.privateNetworkConfirmed !== true) { unknown.push('PRIVATE_NETWORK_NOT_CONFIRMED'); }
  if (context.existingDatabasesProtected !== true) { unknown.push('EXISTING_DATABASE_PROTECTION_NOT_CONFIRMED'); }
  if (context.dedicatedDatabaseApproved !== true) { unknown.push('DEDICATED_TEST_DATABASE_NOT_APPROVED'); }
  if (context.restrictedRunnerApproved !== true) { unknown.push('RESTRICTED_TEST_RUNNER_NOT_APPROVED'); }
  return {
    status: blockers.length ? 'SECURITY_REVIEW_REQUIRED'
      : unknown.length ? 'ADDITIONAL_EVIDENCE_REQUIRED' : 'PROVISIONING_REVIEW_ONLY',
    blockers, unknown,
    targetDatabase: 'sbn_forge_execution_test',
    existingDatabasesProtected: context.existingDatabasesProtected === true,
    databaseProvisioned: false,
    authorizationMarkerEnabled: false,
    integrationTestsAuthorized: false,
    integrationTestsExecuted: false,
    nextStep: 'INDEPENDENT_ADMINISTRATOR_REVIEW_AND_SEPARATE_PROVISIONING_APPROVAL'
  };
}

module.exports = { assessLinuxIsolation };
