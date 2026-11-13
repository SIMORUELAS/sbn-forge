'use strict';

// This preflight never opens a connection, executes SQL or authorizes installation.
// Its purpose is to reject unsafe configurations before a separate, approved
// PostgreSQL integration harness is ever allowed to run.
const BLOCKED_NAMES = new Set(['postgres', 'template0', 'template1', 'production', 'prod', 'sbn', 'sbnportal', 'sbnportal_forge', 'forge']);
const BLOCKED_HOSTS = new Set(['', '0.0.0.0']);
function inspectPortalTenantPgTestTarget({ databaseUrl, expectedDatabase, approval } = {}) {
  const issues = [];
  let url;
  try {
    url = new URL(databaseUrl);
  } catch {
    issues.push('DATABASE_URL_INVALID');
  }
  if (url) {
    if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
      issues.push('POSTGRES_PROTOCOL_REQUIRED');
    }
    if (BLOCKED_HOSTS.has(url.hostname)) {
      issues.push('DATABASE_HOST_INVALID');
    }
    const name = decodeURIComponent(url.pathname.slice(1));
    if (!/^[a-z][a-z0-9_]{2,62}$/.test(name) ||
        BLOCKED_NAMES.has(name) || !/(^test_|_test$|_test_)/.test(name)) {
      issues.push('DEDICATED_TEST_DATABASE_REQUIRED');
    }
    if (!expectedDatabase || name !== expectedDatabase) {
      issues.push('EXPECTED_TEST_DATABASE_MISMATCH');
    }
    if (url.searchParams.has('options') ||
        url.searchParams.has('service') ||
        url.searchParams.has('host')) {
      issues.push('CONNECTION_OVERRIDE_NOT_ALLOWED');
    }
  }
  if (approval !== '1') {
    issues.push('EXPLICIT_TEST_RUN_APPROVAL_REQUIRED');
  }
  return Object.freeze({
    readyForIndependentReview: issues.length === 0,
    issues: Object.freeze(issues),
    mode: 'STATIC_PREFLIGHT_ONLY',
    connectionAttempted: false,
    sqlExecuted: false,
    installationAuthorized: false,
    publicationAuthorized: false
  });
}
module.exports = { inspectPortalTenantPgTestTarget };
