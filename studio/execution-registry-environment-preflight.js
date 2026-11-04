'use strict';
const { Pool } = require('pg');
const { classifyExecutionRegistryPreflight } = require('./execution-registry-preflight-diagnostics');
const {
  requireDedicatedTestDatabase, assertAuthorizedTestDatabase
} = require('./execution-registry-test-guard');

// Read-only diagnostic. Never creates databases, authorization markers or schema.
// The operator must independently verify host isolation and database ownership.
async function inspectExecutionRegistryTestEnvironment({
  env = process.env, createPool = options => new Pool(options)
} = {}) {
  const expectedDatabase = env.SBN_FORGE_EXECUTION_REGISTRY_EXPECTED_TEST_DATABASE;
  const connectionString = requireDedicatedTestDatabase(
    env.SBN_FORGE_EXECUTION_REGISTRY_TEST_DATABASE_URL, expectedDatabase
  );
  const pool = createPool({ connectionString, max: 1, connectionTimeoutMillis: 5000 });
  try {
    await assertAuthorizedTestDatabase(pool, expectedDatabase);
    const result = await pool.query(`
      SELECT current_database() AS database_name,
             current_user AS database_user,
             has_database_privilege(current_user, current_database(), 'CREATE') AS can_create_schema,
             has_schema_privilege(current_user, 'public', 'USAGE') AS public_usage,
             has_table_privilege(
               current_user,
               'public.sbn_forge_execution_registry_test_authorization',
               'SELECT'
             ) AS can_read_marker,
             has_table_privilege(
               current_user,
               'public.sbn_forge_execution_registry_test_authorization',
               'INSERT, UPDATE, DELETE'
             ) AS can_write_marker
    `);
    if (!result || !Array.isArray(result.rows) || result.rows.length !== 1) {
      throw new Error('INVALID_TEST_DATABASE_PREFLIGHT_RESULT');
    }
    const row = result.rows[0];
    if (row.database_name !== expectedDatabase ||
        row.can_create_schema !== true ||
        row.public_usage !== true ||
        row.can_read_marker !== true ||
        row.can_write_marker !== false) {
      throw new Error('TEST_DATABASE_PRIVILEGE_POLICY_NOT_MET');
    }
    return {
      readyForIntegration: true,
      databaseName: expectedDatabase,
      databaseUser: row.database_user,
      authorizationVerified: true,
      markerReadOnly: true,
      schemaCreationPermitted: true,
      certificationAuthorized: false,
      installable: false
    };
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  inspectExecutionRegistryTestEnvironment()
    .then(result => {
      process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    })
    .catch(error => {
      // Only predefined diagnostic categories are emitted, never raw driver errors.
      process.stderr.write(JSON.stringify(classifyExecutionRegistryPreflight(error)) + '\n');
      process.exitCode = 1;
    });
}

module.exports = { inspectExecutionRegistryTestEnvironment };
