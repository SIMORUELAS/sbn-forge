'use strict';
const { assessLinuxIsolation } = require('../studio/linux-postgres-isolation-assessment');

const inventory = {
  status: 'READ_ONLY_INVENTORY_COMPLETE',
  suitableForForgeIntegration: false,
  integrationTestsExecuted: false,
  sslActive: true, privilegedRole: false, databaseOwnerMember: false,
  canCreateSchema: false, publicCreate: false, publicUsage: true
};
const context = {
  nonProductionConfirmed: true, privateNetworkConfirmed: true,
  existingDatabasesProtected: true, dedicatedDatabaseApproved: true,
  restrictedRunnerApproved: true
};

test('rejects missing or untrusted inventory', () => {
  expect(() => assessLinuxIsolation(null)).toThrow('VALID_READ_ONLY_INVENTORY_REQUIRED');
  expect(() => assessLinuxIsolation({ ...inventory, integrationTestsExecuted: true }))
    .toThrow('VALID_READ_ONLY_INVENTORY_REQUIRED');
});
test('never authorizes integration even when all review evidence is favorable', () => {
  const result = assessLinuxIsolation(inventory, context);
  expect(result.status).toBe('PROVISIONING_REVIEW_ONLY');
  expect(result.databaseProvisioned).toBe(false);
  expect(result.integrationTestsAuthorized).toBe(false);
  expect(result.authorizationMarkerEnabled).toBe(false);
});
test('blocks insecure transport or privileged inspection login', () => {
  const result = assessLinuxIsolation({ ...inventory, sslActive: false, privilegedRole: true }, context);
  expect(result.status).toBe('SECURITY_REVIEW_REQUIRED');
  expect(result.blockers).toContain('TLS_NOT_VERIFIED');
  expect(result.blockers).toContain('INSPECTION_ROLE_NOT_RESTRICTED');
});
test('does not infer administrator approvals from PostgreSQL inventory', () => {
  const result = assessLinuxIsolation(inventory);
  expect(result.status).toBe('ADDITIONAL_EVIDENCE_REQUIRED');
  expect(result.unknown).toContain('DEDICATED_TEST_DATABASE_NOT_APPROVED');
  expect(result.integrationTestsAuthorized).toBe(false);
});
