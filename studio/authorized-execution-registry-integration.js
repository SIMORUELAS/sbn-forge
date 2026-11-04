'use strict';
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { Pool } = require('pg');
const {
  requireDedicatedTestDatabase, assertAuthorizedTestDatabase
} = require('./execution-registry-test-guard');

const INTEGRATION_SUITE = path.resolve(__dirname, '../tests/studio-postgres-execution-registry.integration.test.js');

// Preflight never creates a database, marker, schema or runner.
async function runAuthorizedExecutionRegistryIntegration({
  env = process.env, createPool = options => new Pool(options),
  execute = (command, args, options) => spawnSync(command, args, options)
} = {}) {
  if (env.SBN_FORGE_EXECUTION_REGISTRY_RUN_APPROVED !== '1') {
    throw new Error('EXPLICIT_EXECUTION_REGISTRY_RUN_APPROVAL_REQUIRED');
  }
  const expectedDatabase = env.SBN_FORGE_EXECUTION_REGISTRY_EXPECTED_TEST_DATABASE;
  const connectionString = requireDedicatedTestDatabase(
    env.SBN_FORGE_EXECUTION_REGISTRY_TEST_DATABASE_URL, expectedDatabase
  );
  const pool = createPool({ connectionString, max: 1, connectionTimeoutMillis: 5000 });
  try {
    await assertAuthorizedTestDatabase(pool, expectedDatabase);
  } finally {
    await pool.end();
  }

  const jestPath = require.resolve('jest/bin/jest');
  const result = execute(process.execPath, [
    jestPath, '--runInBand', '--runTestsByPath', INTEGRATION_SUITE
  ], {
    cwd: path.resolve(__dirname, '..'),
    stdio: 'inherit',
    timeout: 120000,
    shell: false,
    env: {
      ...env,
      SBN_FORGE_RUN_EXECUTION_REGISTRY_PG_INTEGRATION: '1',
      SBN_FORGE_EXECUTION_REGISTRY_EXPECTED_TEST_DATABASE: expectedDatabase,
      SBN_FORGE_EXECUTION_REGISTRY_TEST_DATABASE_URL: connectionString
    }
  });
  if (!result || result.error || result.status !== 0) {
    throw new Error('EXECUTION_REGISTRY_INTEGRATION_FAILED');
  }
  return { passed: true, certificationAuthorized: false, installable: false };
}

if (require.main === module) {
  runAuthorizedExecutionRegistryIntegration().catch(error => {
    // Never print connection strings or driver errors that may contain credentials.
    process.stderr.write('Execution registry integration blocked or failed: ' +
      (String(error.message).startsWith('EXECUTION_') ||
       String(error.message).startsWith('EXPLICIT_') ||
       String(error.message).startsWith('UNSAFE_') ||
       String(error.message).startsWith('EXACT_') ||
       String(error.message).startsWith('DEDICATED_') ||
       String(error.message).startsWith('POSTGRESQL_') ||
       String(error.message).startsWith('INVALID_') ||
       String(error.message).startsWith('TEST_DATABASE_')
        ? error.message : 'PREFLIGHT_UNAVAILABLE') + '\n');
    process.exitCode = 1;
  });
}

module.exports = { runAuthorizedExecutionRegistryIntegration };
