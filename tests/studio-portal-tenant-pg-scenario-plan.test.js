'use strict';
const { preparePortalTenantPgScenarioPlan } = require('../studio/portal-tenant-pg-scenario-plan');
describe('Portal tenant PostgreSQL offline scenario contract', () => {
  test('contains two distinct fixed UUID organizations and records', () => {
    const plan = preparePortalTenantPgScenarioPlan();
    expect(new Set(Object.values(plan.organizations)).size).toBe(2);
    expect(new Set(Object.values(plan.records)).size).toBe(2);
    for (const id of [...Object.values(plan.organizations), ...Object.values(plan.records)]) {
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/);
    }
  });
  test('covers cross-tenant read, list, update and delete in both directions', () => {
    const plan = preparePortalTenantPgScenarioPlan();
    for (const operation of ['list', 'read', 'update', 'delete']) {
      for (const [actor, target] of [['alpha', 'beta'], ['beta', 'alpha']]) {
        expect(plan.cases).toEqual(expect.arrayContaining([
          expect.objectContaining({ operation, actor, target,
            expected: ['list', 'read'].includes(operation) ? 'hidden' : 'denied' })
        ]));
      }
    }
  });
  test('covers forged create tenant and missing trusted context', () => {
    const { cases } = preparePortalTenantPgScenarioPlan();
    expect(cases).toEqual(expect.arrayContaining([
      expect.objectContaining({ operation: 'create', expected: 'force_authenticated_tenant' }),
      expect.objectContaining({ operation: 'missing_context', expected: 'denied_before_sql' })
    ]));
  });
  test('plan is immutable and never grants execution or installation', () => {
    const plan = preparePortalTenantPgScenarioPlan();
    expect(Object.isFrozen(plan)).toBe(true);
    expect(Object.isFrozen(plan.cases)).toBe(true);
    expect(plan.cases.every(Object.isFrozen)).toBe(true);
    expect(plan).toMatchObject({
      mode: 'OFFLINE_SCENARIO_PLAN', connectionAttempted: false, sqlExecuted: false,
      fixtureExecutionAuthorized: false, installationAuthorized: false,
      publicationAuthorized: false
    });
  });
});
