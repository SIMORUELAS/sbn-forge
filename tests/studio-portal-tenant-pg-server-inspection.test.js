'use strict';
const { inspectPortalTenantPgServer } = require('../studio/portal-tenant-pg-server-inspection');
const config = {
  databaseUrl: 'postgresql://test_reader@localhost:5432/sbn_tenant_test',
  expectedDatabase: 'sbn_tenant_test', approval: '1'
};
const row = {
  database_name: 'sbn_tenant_test', database_user: 'test_reader',
  privileged_role: false, database_owner_member: false,
  can_create_schema: false, public_create: false
};
describe('Portal tenant PostgreSQL read-only server identity gate', () => {
  test('rejects static failure without querying', async () => {
    const query = jest.fn();
    const result = await inspectPortalTenantPgServer({ ...config, approval: '0', query });
    expect(result).toMatchObject({ readyForIntegration: false, queryAttempted: false });
    expect(query).not.toHaveBeenCalled();
  });
  test('rejects missing query adapter', async () => {
    const result = await inspectPortalTenantPgServer(config);
    expect(result.reason).toBe('READ_ONLY_QUERY_ADAPTER_REQUIRED');
  });
  test('checks actual server identity with one parameter-free SELECT', async () => {
    const query = jest.fn().mockResolvedValue({ rows: [row] });
    const result = await inspectPortalTenantPgServer({ ...config, query });
    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0][0]).toMatch(/SELECT current_database\(\)/);
    expect(query.mock.calls[0][1]).toEqual([]);
    expect(result).toMatchObject({
      readyForIntegration: true, identityVerified: true,
      fixtureExecutionAuthorized: false, installationAuthorized: false,
      publicationAuthorized: false
    });
  });
  test.each([
    [{ database_name: 'sbnportal_forge' }],
    [{ privileged_role: true }],
    [{ database_owner_member: true }],
    [{ can_create_schema: true }],
    [{ public_create: true }],
    [{ database_user: '' }]
  ])('rejects unexpected database identity or privilege %#', async change => {
    const query = jest.fn().mockResolvedValue({ rows: [{ ...row, ...change }] });
    const result = await inspectPortalTenantPgServer({ ...config, query });
    expect(result.readyForIntegration).toBe(false);
    expect(result.fixtureExecutionAuthorized).toBe(false);
  });
  test('rejects missing or ambiguous identity rows', async () => {
    for (const rows of [[], [row, row]]) {
      const result = await inspectPortalTenantPgServer({
        ...config, query: async () => ({ rows })
      });
      expect(result.readyForIntegration).toBe(false);
    }
  });
});
