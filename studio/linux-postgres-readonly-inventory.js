'use strict';
const { Pool } = require('pg');

// Discovery only: no DDL, DML, authorization marker or test execution.
function parseTarget(env) {
  const raw = env.SBN_FORGE_LINUX_INSPECTION_DATABASE_URL;
  if (!raw) { throw new Error('LINUX_INSPECTION_URL_REQUIRED'); }
  let url;
  try { url = new URL(raw); } catch { throw new Error('INVALID_LINUX_INSPECTION_URL'); }
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) { throw new Error('POSTGRESQL_URL_REQUIRED'); }
  const db = decodeURIComponent(url.pathname.replace(/^\//, ''));
  const expected = env.SBN_FORGE_LINUX_INSPECTION_EXPECTED_DATABASE;
  if (!expected || db !== expected) { throw new Error('EXACT_INSPECTION_DATABASE_REQUIRED'); }
  if (!url.hostname || !url.port) { throw new Error('EXPLICIT_HOST_AND_PORT_REQUIRED'); }
  return { connectionString: raw, expected };
}

async function inspectLinuxPostgres({ env = process.env, createPool = opts => new Pool(opts) } = {}) {
  const { connectionString, expected } = parseTarget(env);
  const pool = createPool({ connectionString, max: 1, connectionTimeoutMillis: 5000,
    application_name: 'sbn_forge_readonly_inventory' });
  try {
    const result = await pool.query(`
      SELECT current_database() AS database_name,
             current_user AS database_user,
             current_setting('server_version') AS server_version,
             current_setting('server_version_num')::integer AS server_version_num,
             inet_server_addr()::text AS server_address,
             inet_server_port() AS server_port,
             (SELECT ssl FROM pg_stat_ssl WHERE pid = pg_backend_pid()) AS ssl_active,
             (SELECT rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls
                FROM pg_roles WHERE rolname = current_user) AS privileged_role,
             (SELECT pg_has_role(current_user, d.datdba, 'MEMBER')
                FROM pg_database d WHERE d.datname = current_database()) AS database_owner_member,
             has_database_privilege(current_user, current_database(), 'CREATE') AS can_create_schema,
             has_schema_privilege(current_user, 'public', 'USAGE') AS public_usage,
             has_schema_privilege(current_user, 'public', 'CREATE') AS public_create
    `);
    if (!result || !Array.isArray(result.rows) || result.rows.length !== 1 ||
        result.rows[0].database_name !== expected) { throw new Error('INSPECTION_DATABASE_MISMATCH'); }
    const x = result.rows[0];
    return {
      status: 'READ_ONLY_INVENTORY_COMPLETE',
      databaseName: x.database_name,
      serverVersion: x.server_version,
      serverVersionNum: x.server_version_num,
      serverPort: x.server_port,
      sslActive: x.ssl_active === true,
      privilegedRole: x.privileged_role === true,
      databaseOwnerMember: x.database_owner_member === true,
      canCreateSchema: x.can_create_schema === true,
      publicUsage: x.public_usage === true,
      publicCreate: x.public_create === true,
      // Never claim suitability based on an inventory of an existing database.
      suitableForForgeIntegration: false,
      testDatabaseCreated: false,
      markerEnabled: false,
      integrationTestsExecuted: false,
      nextStep: 'REVIEW_NETWORK_TLS_ROLE_ISOLATION_AND_APPROVE_DEDICATED_TEST_DATABASE'
    };
  } finally { await pool.end(); }
}
if (require.main === module) {
  inspectLinuxPostgres().then(x => process.stdout.write(JSON.stringify(x, null, 2) + '\n'))
    .catch(e => {
      const allowed = new Set([
        'LINUX_INSPECTION_URL_REQUIRED','INVALID_LINUX_INSPECTION_URL','POSTGRESQL_URL_REQUIRED',
        'EXACT_INSPECTION_DATABASE_REQUIRED','EXPLICIT_HOST_AND_PORT_REQUIRED','INSPECTION_DATABASE_MISMATCH'
      ]);
      process.stderr.write(JSON.stringify({ status: 'INSPECTION_BLOCKED',
        reason: allowed.has(e.message) ? e.message : 'CONNECTION_OR_READ_ONLY_QUERY_FAILED' }) + '\n');
      process.exitCode = 1;
    });
}
module.exports = { parseTarget, inspectLinuxPostgres };
