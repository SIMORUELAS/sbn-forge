'use strict';
const { inspectPortalTenantPgTestTarget } = require('./portal-tenant-pg-test-preflight');

// The caller supplies a read-only query adapter. This module neither opens a
// connection nor grants permission to create fixtures or install a module.
const IDENTITY_SQL = `
SELECT current_database() AS database_name,
       current_user AS database_user,
       (SELECT rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls
          FROM pg_roles WHERE rolname = current_user) AS privileged_role,
       (SELECT pg_has_role(current_user, d.datdba, 'MEMBER')
          FROM pg_database d WHERE d.datname = current_database()) AS database_owner_member,
       has_database_privilege(current_user, current_database(), 'CREATE') AS can_create_schema,
       has_schema_privilege(current_user, 'public', 'CREATE') AS public_create
`;
async function inspectPortalTenantPgServer({ databaseUrl, expectedDatabase, approval, query } = {}) {
  const target = inspectPortalTenantPgTestTarget({ databaseUrl, expectedDatabase, approval });
  if (!target.readyForIndependentReview) {
    return Object.freeze({ readyForIntegration: false, reason: 'STATIC_PREFLIGHT_REJECTED',
      issues: target.issues, queryAttempted: false, installationAuthorized: false });
  }
  if (typeof query !== 'function') {
    return Object.freeze({ readyForIntegration: false, reason: 'READ_ONLY_QUERY_ADAPTER_REQUIRED',
      queryAttempted: false, installationAuthorized: false });
  }
  // Exactly one read-only identity query; do not interpolate caller input.
  const result = await query(IDENTITY_SQL, []);
  const row = result?.rows?.length === 1 ? result.rows[0] : null;
  const accepted = row && row.database_name === expectedDatabase &&
    typeof row.database_user === 'string' && row.database_user.length > 0 &&
    row.privileged_role === false && row.database_owner_member === false &&
    row.can_create_schema === false && row.public_create === false;
  return Object.freeze({
    readyForIntegration: Boolean(accepted),
    reason: accepted ? 'IDENTITY_AND_RESTRICTED_ROLE_VERIFIED' : 'DATABASE_IDENTITY_OR_PRIVILEGES_REJECTED',
    queryAttempted: true, identityVerified: Boolean(accepted),
    fixtureExecutionAuthorized: false, installationAuthorized: false,
    publicationAuthorized: false
  });
}
module.exports = { IDENTITY_SQL, inspectPortalTenantPgServer };
