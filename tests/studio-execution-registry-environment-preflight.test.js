'use strict';
const { inspectExecutionRegistryTestEnvironment } =
  require('../studio/execution-registry-environment-preflight');

const env = {
  SBN_FORGE_EXECUTION_REGISTRY_EXPECTED_TEST_DATABASE: 'forge_execution_test',
  SBN_FORGE_EXECUTION_REGISTRY_TEST_DATABASE_URL: 'postgres://local/forge_execution_test'
};
const permitted = {
  database_name: 'forge_execution_test', database_user: 'test_runner',
  can_create_schema: true, public_usage: true,
  public_create: false, privileged_role: false,
  can_read_marker: true, can_write_marker: false, can_alter_marker: false
};
let pool, createPool;
beforeEach(() => {
  pool = {
    query: jest.fn()
      .mockResolvedValueOnce({ rows: [{ database_name: 'forge_execution_test', authorized: true }] })
      .mockResolvedValueOnce({ rows: [permitted] }),
    end: jest.fn().mockResolvedValue(undefined)
  };
  createPool = jest.fn().mockReturnValue(pool);
});

test('read-only preflight returns safe summary without credentials', async () => {
  const result = await inspectExecutionRegistryTestEnvironment({ env, createPool });
  expect(result).toMatchObject({
    readyForIntegration: true, markerReadOnly: true,
    certificationAuthorized: false, installable: false
  });
  expect(JSON.stringify(result)).not.toContain('postgres://');
  expect(pool.query).toHaveBeenCalledTimes(2);
  expect(pool.query.mock.calls.every(([sql]) => /^\s*SELECT/i.test(sql))).toBe(true);
  expect(pool.end).toHaveBeenCalledTimes(1);
});

test('wrong database fails before opening connection', async () => {
  await expect(inspectExecutionRegistryTestEnvironment({
    env: { ...env, SBN_FORGE_EXECUTION_REGISTRY_EXPECTED_TEST_DATABASE: 'other_test' },
    createPool
  })).rejects.toThrow('EXACT_TEST_DATABASE_CONFIRMATION_REQUIRED');
  expect(createPool).not.toHaveBeenCalled();
});

test('rejects marker modification privileges', async () => {
  pool.query.mockReset()
    .mockResolvedValueOnce({ rows: [{ database_name: 'forge_execution_test', authorized: true }] })
    .mockResolvedValueOnce({ rows: [{ ...permitted, can_write_marker: true }] });
  await expect(inspectExecutionRegistryTestEnvironment({ env, createPool }))
    .rejects.toThrow('TEST_DATABASE_PRIVILEGE_POLICY_NOT_MET');
  expect(pool.end).toHaveBeenCalled();
});

test('rejects missing schema creation privileges', async () => {
  pool.query.mockReset()
    .mockResolvedValueOnce({ rows: [{ database_name: 'forge_execution_test', authorized: true }] })
    .mockResolvedValueOnce({ rows: [{ ...permitted, can_create_schema: false }] });
  await expect(inspectExecutionRegistryTestEnvironment({ env, createPool }))
    .rejects.toThrow('TEST_DATABASE_PRIVILEGE_POLICY_NOT_MET');
});

test('missing authorization and query failures close connection', async () => {
  pool.query.mockReset().mockResolvedValue({ rows: [{ database_name: 'forge_execution_test', authorized: false }] });
  await expect(inspectExecutionRegistryTestEnvironment({ env, createPool }))
    .rejects.toThrow('TEST_DATABASE_NOT_INDEPENDENTLY_AUTHORIZED');
  expect(pool.end).toHaveBeenCalled();
});

test.each([
  ['privileged PostgreSQL role', { privileged_role: true }],
  ['public schema CREATE privilege', { public_create: true }],
  ['authorization marker DDL privileges', { can_alter_marker: true }]
])('rejects %s without changing PostgreSQL', async (_, changes) => {
  pool.query.mockReset()
    .mockResolvedValueOnce({ rows: [{ database_name: 'forge_execution_test', authorized: true }] })
    .mockResolvedValueOnce({ rows: [{ ...permitted, ...changes }] });
  await expect(inspectExecutionRegistryTestEnvironment({ env, createPool }))
    .rejects.toThrow('TEST_DATABASE_PRIVILEGE_POLICY_NOT_MET');
  expect(pool.end).toHaveBeenCalledTimes(1);
  expect(pool.query.mock.calls.every(([sql]) => /^\s*SELECT/i.test(sql))).toBe(true);
});
