'use strict';

const { planForgeProvisioning, PHASES, ROLLBACK } =
  require('../studio/linux-postgres-provisioning-plan');
const { REQUIRED, TARGET } = require('../studio/linux-postgres-database-boundary');

const inventory = {
  status: 'READ_ONLY_INVENTORY_COMPLETE', suitableForForgeIntegration: false,
  integrationTestsExecuted: false, sslActive: true, privilegedRole: false,
  databaseOwnerMember: false, canCreateSchema: false, publicCreate: false, publicUsage: true
};
const context = {
  nonProductionConfirmed: true, privateNetworkConfirmed: true,
  existingDatabasesProtected: true, dedicatedDatabaseApproved: true,
  restrictedRunnerApproved: true
};
const proposal = {
  databaseName: TARGET, usesAdministrativeRole: false,
  crossDatabaseAccessDisabled: true,
  confirmations: Object.fromEntries(REQUIRED.map(key => [key, true]))
};

test('fails closed without trusted inventory', () => {
  expect(() => planForgeProvisioning()).toThrow('VALID_READ_ONLY_INVENTORY_REQUIRED');
});
test('blocks an existing portal database and never emits executable SQL', () => {
  const result = planForgeProvisioning({ inventory, context, proposal: {
    ...proposal, databaseName: 'sbn_portal_test'
  } });
  expect(result.status).toBe('PROCEDURE_BLOCKED');
  expect(result.blockers).toContain('PROTECTED_DATABASE_TARGET');
  expect(result.sqlGenerated).toBe(false);
  expect(result.sqlExecuted).toBe(false);
});
test('requires independently verified confirmations', () => {
  const result = planForgeProvisioning({ inventory, context, proposal: {
    ...proposal, confirmations: {}
  } });
  expect(result.status).toBe('PROCEDURE_BLOCKED');
  expect(result.missing).toContain('backupRestoreVerified');
});
test('even a favorable plan cannot provision or authorize integration', () => {
  const result = planForgeProvisioning({ inventory, context, proposal });
  expect(result.status).toBe('PROCEDURE_READY_FOR_ADMINISTRATOR_REVIEW');
  expect(result.phases).toEqual(PHASES);
  expect(result.rollback).toEqual(ROLLBACK);
  expect(result.databaseProvisioned).toBe(false);
  expect(result.roleProvisioned).toBe(false);
  expect(result.connectionAttempted).toBe(false);
  expect(result.authorizationMarkerEnabled).toBe(false);
  expect(result.integrationTestsAuthorized).toBe(false);
});
test('does not propagate credentials or connection strings', () => {
  const result = planForgeProvisioning({ inventory, context, proposal: {
    ...proposal, password: 'never-log-this', connectionString: 'sensitive-url'
  } });
  expect(JSON.stringify(result)).not.toMatch(/never-log-this|sensitive-url/);
});
