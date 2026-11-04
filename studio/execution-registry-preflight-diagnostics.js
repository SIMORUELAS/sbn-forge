'use strict';

// Deliberately narrow allowlist. Never serialize raw driver errors, SQL,
// connection URLs, usernames, hosts, or credentials into diagnostics.
function classifyExecutionRegistryPreflight(error) {
  const message = error && typeof error.message === 'string' ? error.message : '';
  const configuration = new Set([
    'DEDICATED_EXECUTION_REGISTRY_TEST_DATABASE_REQUIRED',
    'EXACT_TEST_DATABASE_CONFIRMATION_REQUIRED',
    'INVALID_EXECUTION_REGISTRY_TEST_DATABASE_URL',
    'POSTGRESQL_TEST_DATABASE_REQUIRED',
    'UNSAFE_EXECUTION_REGISTRY_DATABASE_NAME'
  ]);
  if (configuration.has(message)) {
    return {
      code: message === 'EXACT_TEST_DATABASE_CONFIRMATION_REQUIRED' ||
        message === 'UNSAFE_EXECUTION_REGISTRY_DATABASE_NAME'
        ? 'DATABASE_NAME_MISMATCH' : 'CONFIGURATION_MISSING',
      readyForIntegration: false, certificationAuthorized: false, installable: false
    };
  }
  if (message === 'TEST_DATABASE_NOT_INDEPENDENTLY_AUTHORIZED' ||
      message === 'TEST_DATABASE_AUTHORIZATION_REQUIRED' ||
      message === '42P01' || (error && error.code === '42P01')) {
    return {
      code: 'AUTHORIZATION_MISSING',
      readyForIntegration: false, certificationAuthorized: false, installable: false
    };
  }
  if (message === 'TEST_DATABASE_PRIVILEGE_POLICY_NOT_MET' ||
      (error && error.code === '42501')) {
    return {
      code: 'INSUFFICIENT_PRIVILEGES',
      readyForIntegration: false, certificationAuthorized: false, installable: false
    };
  }
  return {
    code: 'CONNECTION_OR_PREFLIGHT_UNAVAILABLE',
    readyForIntegration: false, certificationAuthorized: false, installable: false
  };
}

module.exports = { classifyExecutionRegistryPreflight };
