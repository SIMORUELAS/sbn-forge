'use strict';
const { inspectReadiness } = require('../studio/linux-postgres-inspection-readiness');
const env = {
  SBN_FORGE_LINUX_INSPECTION_DATABASE_URL: 'postgresql://inspector:sample-secret@localhost:5432/postgres',
  SBN_FORGE_LINUX_INSPECTION_EXPECTED_DATABASE: 'postgres',
  SBN_FORGE_LINUX_RESTRICTED_LOGIN_CONFIRMED: 'true',
  SBN_FORGE_LINUX_NETWORK_APPROVED: 'true',
  SBN_FORGE_LINUX_TLS_VERIFIED: 'true',
  SBN_FORGE_LINUX_NONPRODUCTION_CONFIRMED: 'true'
};

test('fails closed when configuration or independent approvals are absent', () => {
  const result = inspectReadiness({});
  expect(result.status).toBe('INSPECTION_NOT_READY');
  expect(result.connectionAttempted).toBe(false);
  expect(result.missing).toContain('exactMaintenanceDatabase');
});
test('requires maintenance database postgres, not existing application database', () => {
  const result = inspectReadiness({
    ...env,
    SBN_FORGE_LINUX_INSPECTION_DATABASE_URL: 'postgresql://inspector@localhost:5432/sbn_portal_test',
    SBN_FORGE_LINUX_INSPECTION_EXPECTED_DATABASE: 'sbn_portal_test'
  });
  expect(result.status).toBe('INSPECTION_NOT_READY');
  expect(result.reason).toBe('MAINTENANCE_DATABASE_REQUIRED');
});
test('reports readiness without attempting connection or authorizing tests', () => {
  const result = inspectReadiness(env);
  expect(result.status).toBe('INSPECTION_CONFIGURATION_READY');
  expect(result.inspectionExecuted).toBe(false);
  expect(result.integrationTestsAuthorized).toBe(false);
  expect(JSON.stringify(result)).not.toContain('sample-secret');
  expect(JSON.stringify(result)).not.toContain('localhost');
});
test('does not interpret missing confirmations as approval', () => {
  const result = inspectReadiness({ ...env, SBN_FORGE_LINUX_TLS_VERIFIED: 'false' });
  expect(result.missing).toContain('tlsVerificationApproved');
  expect(result.status).toBe('INSPECTION_NOT_READY');
});
