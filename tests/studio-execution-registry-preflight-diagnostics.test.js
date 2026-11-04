'use strict';
const { classifyExecutionRegistryPreflight } =
  require('../studio/execution-registry-preflight-diagnostics');

test.each([
  ['DEDICATED_EXECUTION_REGISTRY_TEST_DATABASE_REQUIRED', 'CONFIGURATION_MISSING'],
  ['INVALID_EXECUTION_REGISTRY_TEST_DATABASE_URL', 'CONFIGURATION_MISSING'],
  ['EXACT_TEST_DATABASE_CONFIRMATION_REQUIRED', 'DATABASE_NAME_MISMATCH'],
  ['UNSAFE_EXECUTION_REGISTRY_DATABASE_NAME', 'DATABASE_NAME_MISMATCH'],
  ['TEST_DATABASE_NOT_INDEPENDENTLY_AUTHORIZED', 'AUTHORIZATION_MISSING'],
  ['TEST_DATABASE_PRIVILEGE_POLICY_NOT_MET', 'INSUFFICIENT_PRIVILEGES']
])('maps %s to %s without exposing secrets', (message, code) => {
  const result = classifyExecutionRegistryPreflight(
    new Error(message, { cause: new Error('postgres://user:secret@private/forge_test') })
  );
  expect(result).toEqual({
    code, readyForIntegration: false, certificationAuthorized: false, installable: false
  });
  expect(JSON.stringify(result)).not.toContain('secret');
});

test('recognizes PostgreSQL authorization and privilege SQLSTATE codes', () => {
  expect(classifyExecutionRegistryPreflight({ code: '42P01' }).code)
    .toBe('AUTHORIZATION_MISSING');
  expect(classifyExecutionRegistryPreflight({ code: '42501' }).code)
    .toBe('INSUFFICIENT_PRIVILEGES');
});

test('unknown driver errors are redacted and fail closed', () => {
  const result = classifyExecutionRegistryPreflight(
    new Error('password secret for postgres://admin:secret@production')
  );
  expect(result.code).toBe('CONNECTION_OR_PREFLIGHT_UNAVAILABLE');
  expect(result.readyForIntegration).toBe(false);
  expect(JSON.stringify(result)).not.toContain('secret');
});
