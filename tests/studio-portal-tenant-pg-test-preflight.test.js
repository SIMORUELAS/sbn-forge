'use strict';
const { inspectPortalTenantPgTestTarget } = require('../studio/portal-tenant-pg-test-preflight');
const target = 'postgresql://tester:secret@127.0.0.1:5432/sbn_tenant_test';
function inspect(overrides = {}) {
  return inspectPortalTenantPgTestTarget({
    databaseUrl: target, expectedDatabase: 'sbn_tenant_test', approval: '1', ...overrides
  });
}
describe('Portal tenant PostgreSQL target static safety preflight', () => {
  test('accepts only a syntactically dedicated test target without connecting', () => {
    expect(inspect()).toMatchObject({
      readyForIndependentReview: true, issues: [],
      mode: 'STATIC_PREFLIGHT_ONLY', connectionAttempted: false,
      sqlExecuted: false, installationAuthorized: false, publicationAuthorized: false
    });
  });
  test.each([
    [{ databaseUrl: 'postgresql://tester@localhost/postgres' }, 'DEDICATED_TEST_DATABASE_REQUIRED'],
    [{ databaseUrl: 'postgresql://tester@localhost/sbnportal_forge' }, 'DEDICATED_TEST_DATABASE_REQUIRED'],
    [{ databaseUrl: 'postgresql://tester@localhost/sbn_tenant_test', expectedDatabase: 'other_test' }, 'EXPECTED_TEST_DATABASE_MISMATCH'],
    [{ approval: undefined }, 'EXPLICIT_TEST_RUN_APPROVAL_REQUIRED'],
    [{ databaseUrl: 'https://localhost/sbn_tenant_test' }, 'POSTGRES_PROTOCOL_REQUIRED'],
    [{ databaseUrl: 'postgresql://tester@0.0.0.0/sbn_tenant_test' }, 'DATABASE_HOST_INVALID'],
    [{ databaseUrl: 'postgresql://tester@localhost/sbn_tenant_test?host=production' }, 'CONNECTION_OVERRIDE_NOT_ALLOWED'],
    [{ databaseUrl: 'invalid' }, 'DATABASE_URL_INVALID']
  ])('rejects unsafe or ambiguous configuration %#', (overrides, issue) => {
    const result = inspect(overrides);
    expect(result.readyForIndependentReview).toBe(false);
    expect(result.issues).toContain(issue);
    expect(result.connectionAttempted).toBe(false);
    expect(result.sqlExecuted).toBe(false);
  });
});
