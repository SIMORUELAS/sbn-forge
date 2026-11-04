'use strict';
const { inspectExecutionRegistryConfiguration } =
  require('../studio/execution-registry-configuration-inventory');

const url = 'postgres://runner:supersecret@private.internal:5432/forge_execution_test';
const valid = {
  SBN_FORGE_EXECUTION_REGISTRY_TEST_DATABASE_URL: url,
  SBN_FORGE_EXECUTION_REGISTRY_EXPECTED_TEST_DATABASE: 'forge_execution_test'
};

test('missing configuration is identified without touching PostgreSQL', () => {
  expect(inspectExecutionRegistryConfiguration({})).toMatchObject({
    code: 'CONFIGURATION_MISSING', connectionConfigured: false,
    expectedDatabaseConfigured: false, readyForIntegration: false
  });
});

test('valid configuration still requires external authorization and real preflight', () => {
  const result = inspectExecutionRegistryConfiguration({
    ...valid, SBN_FORGE_EXECUTION_REGISTRY_RUN_APPROVED: '1'
  });
  expect(result).toMatchObject({
    code: 'CONFIGURATION_PRESENT_PREFLIGHT_REQUIRED',
    explicitRunApprovalConfigured: true,
    databaseIsolationVerified: false,
    externalAuthorizationVerified: false,
    readyForIntegration: false,
    certificationAuthorized: false, installable: false
  });
  expect(JSON.stringify(result)).not.toContain('supersecret');
  expect(JSON.stringify(result)).not.toContain('private.internal');
  expect(JSON.stringify(result)).not.toContain('postgres://');
});

test('rejects mismatch and non-test database without exposing the URL', () => {
  expect(inspectExecutionRegistryConfiguration({
    ...valid, SBN_FORGE_EXECUTION_REGISTRY_EXPECTED_TEST_DATABASE: 'other_test'
  }).code).toBe('DATABASE_NAME_MISMATCH');
  const result = inspectExecutionRegistryConfiguration({
    ...valid, SBN_FORGE_EXECUTION_REGISTRY_TEST_DATABASE_URL:
      'postgres://runner:supersecret@private.internal/production'
  });
  expect(result.readyForIntegration).toBe(false);
  expect(JSON.stringify(result)).not.toContain('supersecret');
});

test('does not treat integration test flag as explicit approval', () => {
  expect(inspectExecutionRegistryConfiguration({
    ...valid, SBN_FORGE_RUN_EXECUTION_REGISTRY_PG_INTEGRATION: '1'
  }).explicitRunApprovalConfigured).toBe(false);
});
