'use strict';

// Declarative test plan only. No SQL, database driver, network or fixture writes.
const ORGANIZATIONS = Object.freeze({
  alpha: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  beta: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
});
const RECORDS = Object.freeze({
  alpha: '11111111-1111-4111-8111-111111111111',
  beta: '22222222-2222-4222-8222-222222222222'
});
const CASES = Object.freeze([
  ['list', 'alpha', 'alpha', 'visible'],
  ['list', 'alpha', 'beta', 'hidden'],
  ['read', 'alpha', 'alpha', 'visible'],
  ['read', 'alpha', 'beta', 'hidden'],
  ['create', 'alpha', 'beta', 'force_authenticated_tenant'],
  ['update', 'alpha', 'alpha', 'allowed'],
  ['update', 'alpha', 'beta', 'denied'],
  ['delete', 'alpha', 'alpha', 'allowed'],
  ['delete', 'alpha', 'beta', 'denied'],
  ['list', 'beta', 'alpha', 'hidden'],
  ['read', 'beta', 'alpha', 'hidden'],
  ['update', 'beta', 'alpha', 'denied'],
  ['delete', 'beta', 'alpha', 'denied'],
  ['missing_context', 'none', 'alpha', 'denied_before_sql']
].map(([operation, actor, target, expected]) =>
  Object.freeze({ operation, actor, target, expected })));
function preparePortalTenantPgScenarioPlan() {
  return Object.freeze({
    mode: 'OFFLINE_SCENARIO_PLAN',
    organizations: ORGANIZATIONS,
    records: RECORDS,
    cases: CASES,
    connectionAttempted: false,
    sqlExecuted: false,
    fixtureExecutionAuthorized: false,
    installationAuthorized: false,
    publicationAuthorized: false
  });
}
module.exports = { preparePortalTenantPgScenarioPlan };
