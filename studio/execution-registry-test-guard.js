'use strict';

// This guard is invoked before ANY schema DDL. Provision the authorization
// marker out of band, on an independently verified disposable database.
// The marker is a safety interlock, not proof of environment isolation.
function requireDedicatedTestDatabase(url, expectedDatabase) {
  if (!url) { throw new Error('DEDICATED_EXECUTION_REGISTRY_TEST_DATABASE_REQUIRED'); }
  let parsed;
  try { parsed = new URL(url); }
  catch { throw new Error('INVALID_EXECUTION_REGISTRY_TEST_DATABASE_URL'); }
  if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) {
    throw new Error('POSTGRESQL_TEST_DATABASE_REQUIRED');
  }
  const name = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
  if (!/(^test_|_test$|_test_)/i.test(name)) {
    throw new Error('UNSAFE_EXECUTION_REGISTRY_DATABASE_NAME');
  }
  if (typeof expectedDatabase !== 'string' || expectedDatabase !== name) {
    throw new Error('EXACT_TEST_DATABASE_CONFIRMATION_REQUIRED');
  }
  return url;
}

async function assertAuthorizedTestDatabase(pool, expectedDatabase) {
  if (!pool || typeof pool.query !== 'function' ||
      typeof expectedDatabase !== 'string' || !expectedDatabase) {
    throw new Error('TEST_DATABASE_AUTHORIZATION_REQUIRED');
  }
  // A pre-existing marker is mandatory. Never create it from this test suite.
  const result = await pool.query(
    `SELECT current_database() AS database_name,
            EXISTS (
              SELECT 1 FROM public.sbn_forge_execution_registry_test_authorization
              WHERE database_name = current_database()
                AND purpose = 'execution-registry-integration'
                AND enabled = true
            ) AS authorized`
  );
  if (!result || !Array.isArray(result.rows) || result.rows.length !== 1 ||
      result.rows[0].database_name !== expectedDatabase ||
      result.rows[0].authorized !== true) {
    throw new Error('TEST_DATABASE_NOT_INDEPENDENTLY_AUTHORIZED');
  }
  return true;
}

module.exports = { requireDedicatedTestDatabase, assertAuthorizedTestDatabase };
