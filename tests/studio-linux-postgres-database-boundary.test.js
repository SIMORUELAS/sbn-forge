'use strict';
const { assessForgeDatabaseBoundary, TARGET, PROTECTED, REQUIRED } =
  require('../studio/linux-postgres-database-boundary');

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

test('requires a valid read-only inventory', () => {
  expect(() => assessForgeDatabaseBoundary()).toThrow('VALID_READ_ONLY_INVENTORY_REQUIRED');
});
test.each(PROTECTED)('rejects protected database %s', databaseName => {
  const result = assessForgeDatabaseBoundary({ inventory, context,
    proposal: { ...proposal, databaseName } });
  expect(result.status).toBe('BOUNDARY_REJECTED');
  expect(result.blockers).toContain('PROTECTED_DATABASE_TARGET');
  expect(result.integrationTestsAuthorized).toBe(false);
});
test('rejects unknown destination and privileged or cross-database access', () => {
  const result = assessForgeDatabaseBoundary({ inventory, context, proposal: {
    ...proposal, databaseName: 'another_db', usesAdministrativeRole: true,
    crossDatabaseAccessDisabled: false
  } });
  expect(result.blockers).toEqual(expect.arrayContaining([
    'TARGET_DATABASE_NOT_DEDICATED', 'ADMINISTRATIVE_ROLE_NOT_EXCLUDED',
    'CROSS_DATABASE_ACCESS_NOT_EXCLUDED'
  ]));
});
test('fails closed on absent administrative confirmations', () => {
  const result = assessForgeDatabaseBoundary({ inventory, context, proposal: {
    ...proposal, confirmations: {}
  } });
  expect(result.status).toBe('BOUNDARY_REVIEW_INCOMPLETE');
  expect(result.missing).toContain('backupRestoreVerified');
});
test('even complete design never authorizes provisioning or tests', () => {
  const result = assessForgeDatabaseBoundary({ inventory, context, proposal });
  expect(result.status).toBe('BOUNDARY_DESIGN_READY_FOR_INDEPENDENT_REVIEW');
  expect(result.databaseProvisioned).toBe(false);
  expect(result.roleProvisioned).toBe(false);
  expect(result.connectionAttempted).toBe(false);
  expect(result.sqlExecuted).toBe(false);
  expect(result.integrationTestsAuthorized).toBe(false);
  expect(result.integrationTestsExecuted).toBe(false);
});
test('does not leak extraneous secrets from input', () => {
  const result = assessForgeDatabaseBoundary({ inventory, context, proposal: {
    ...proposal, password: 'not-for-output', hostname: 'private-host'
  } });
  expect(JSON.stringify(result)).not.toMatch(/not-for-output|private-host/);
});
