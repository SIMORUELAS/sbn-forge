'use strict';
const { parseTarget, inspectLinuxPostgres } = require('../studio/linux-postgres-readonly-inventory');
const env = {
  SBN_FORGE_LINUX_INSPECTION_DATABASE_URL: 'postgresql://inspector:example@localhost:5432/postgres',
  SBN_FORGE_LINUX_INSPECTION_EXPECTED_DATABASE: 'postgres'
};
test('rejects missing or mismatched database confirmation', () => {
  expect(() => parseTarget({})).toThrow('LINUX_INSPECTION_URL_REQUIRED');
  expect(() => parseTarget({ ...env, SBN_FORGE_LINUX_INSPECTION_EXPECTED_DATABASE: 'other' }))
    .toThrow('EXACT_INSPECTION_DATABASE_REQUIRED');
});
test('only performs a read-only SELECT and never approves integration', async () => {
  const query = jest.fn(async sql => {
    expect(sql.trim()).toMatch(/^SELECT\s/i);
    expect(sql).not.toMatch(/;\s*(CREATE|INSERT|UPDATE|DELETE|DROP|ALTER|GRANT|REVOKE)\b/i);
    return { rows: [{
      database_name: 'postgres', server_version: '15.2', server_version_num: 150002,
      server_port: 5432, ssl_active: true, privileged_role: false,
      database_owner_member: false, can_create_schema: false,
      public_usage: true, public_create: false
    }] };
  });
  const end = jest.fn();
  const result = await inspectLinuxPostgres({ env, createPool: () => ({ query, end }) });
  expect(query).toHaveBeenCalledTimes(1);
  expect(end).toHaveBeenCalledTimes(1);
  expect(result.suitableForForgeIntegration).toBe(false);
  expect(result.integrationTestsExecuted).toBe(false);
  expect(JSON.stringify(result)).not.toContain('example');
});
test('fails closed on database identity mismatch', async () => {
  const end = jest.fn();
  await expect(inspectLinuxPostgres({
    env, createPool: () => ({ query: async () => ({ rows: [{ database_name: 'other' }] }), end })
  })).rejects.toThrow('INSPECTION_DATABASE_MISMATCH');
  expect(end).toHaveBeenCalled();
});
