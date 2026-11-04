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
             has_schema_privilege(current_user, 'public', 'CREATE') AS public_create,
             (SELECT rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls
                FROM pg_roles WHERE rolname = current_user) AS privileged_role,
             (SELECT pg_has_role(current_user, d.datdba, 'MEMBER')
                FROM pg_database d WHERE d.datname = current_database()) AS database_owner_member,
             (SELECT pg_has_role(current_user, c.relowner, 'MEMBER')
                FROM pg_class c
                WHERE c.oid = 'public.sbn_forge_execution_registry_test_authorization'::regclass)
                AS marker_owner_member,
             has_table_privilege(
               current_user,
               'public.sbn_forge_execution_registry_test_authorization',
               'SELECT'
             ) AS can_read_marker,
             has_table_privilege(
               current_user,
               'public.sbn_forge_execution_registry_test_authorization',
               'INSERT, UPDATE, DELETE'
             ) AS can_write_marker,
             has_table_privilege(
               current_user,
               'public.sbn_forge_execution_registry_test_authorization',
               'TRUNCATE, REFERENCES, TRIGGER'
             ) AS can_alter_marker
    `);
    if (!result || !Array.isArray(result.rows) || result.rows.length !== 1) {
      throw new Error('INVALID_TEST_DATABASE_PREFLIGHT_RESULT');
    }
    const row = result.rows[0];
    if (row.database_name !== expectedDatabase ||
        row.can_create_schema !== true ||
        row.public_usage !== true ||
        row.public_create !== false ||
        row.privileged_role !== false ||
        row.database_owner_member !== false ||
        row.marker_owner_member !== false ||
        row.can_read_marker !== true ||
        row.can_write_marker !== false ||
        row.can_alter_marker !== false) {
      throw new Error('TEST_DATABASE_PRIVILEGE_POLICY_NOT_MET');
    }
    return {
      readyForIntegration: true,
      databaseName: expectedDatabase,
      databaseUser: row.database_user,
      authorizationVerified: true,
      markerReadOnly: true,
      restrictedRoleVerified: true,
      databaseOwnershipSeparated: true,
      authorizationMarkerOwnershipSeparated: true,
      publicSchemaWriteBlocked: true,
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
