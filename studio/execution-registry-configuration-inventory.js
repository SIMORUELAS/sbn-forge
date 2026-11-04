'use strict';
const { requireDedicatedTestDatabase } = require('./execution-registry-test-guard');
const { classifyExecutionRegistryPreflight } = require('./execution-registry-preflight-diagnostics');

// Local environment inventory only: no PostgreSQL connection, writes or secrets in output.
// Configuration is not evidence of server isolation or external authorization.
function inspectExecutionRegistryConfiguration(env = process.env) {
  const hasUrl = typeof env.SBN_FORGE_EXECUTION_REGISTRY_TEST_DATABASE_URL === 'string' &&
    env.SBN_FORGE_EXECUTION_REGISTRY_TEST_DATABASE_URL.length > 0;
  const hasExpectedName =
    typeof env.SBN_FORGE_EXECUTION_REGISTRY_EXPECTED_TEST_DATABASE === 'string' &&
    env.SBN_FORGE_EXECUTION_REGISTRY_EXPECTED_TEST_DATABASE.length > 0;
  const summary = {
    phase: 'LOCAL_CONFIGURATION_ONLY',
    connectionConfigured: hasUrl,
    expectedDatabaseConfigured: hasExpectedName,
    explicitRunApprovalConfigured: env.SBN_FORGE_EXECUTION_REGISTRY_RUN_APPROVED === '1',
    databaseIsolationVerified: false,
    externalAuthorizationVerified: false,
    readyForIntegration: false,
    certificationAuthorized: false,
    installable: false
  };
  if (!hasUrl || !hasExpectedName) {
    return { ...summary, code: 'CONFIGURATION_MISSING' };
  }
  try {
    requireDedicatedTestDatabase(
      env.SBN_FORGE_EXECUTION_REGISTRY_TEST_DATABASE_URL,
      env.SBN_FORGE_EXECUTION_REGISTRY_EXPECTED_TEST_DATABASE
    );
    return { ...summary, code: 'CONFIGURATION_PRESENT_PREFLIGHT_REQUIRED' };
  } catch (error) {
    return { ...summary, code: classifyExecutionRegistryPreflight(error).code };
  }
}

if (require.main === module) {
  process.stdout.write(JSON.stringify(inspectExecutionRegistryConfiguration(), null, 2) + '\n');
}

module.exports = { inspectExecutionRegistryConfiguration };
