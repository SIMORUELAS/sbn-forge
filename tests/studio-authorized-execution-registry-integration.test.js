'use strict';
const { runAuthorizedExecutionRegistryIntegration } =
  require('../studio/authorized-execution-registry-integration');

const url = 'postgres://user:secret@localhost/forge_test';
const env = {
  SBN_FORGE_EXECUTION_REGISTRY_RUN_APPROVED: '1',
  SBN_FORGE_EXECUTION_REGISTRY_TEST_DATABASE_URL: url,
  SBN_FORGE_EXECUTION_REGISTRY_EXPECTED_TEST_DATABASE: 'forge_test'
};
const permitted = {
  database_name: 'forge_test', database_user: 'integration_runner',
  can_create_schema: true, public_usage: true,
  public_create: false, privileged_role: false,
  can_read_marker: true, can_write_marker: false, can_alter_marker: false
};
let pool, createPool, execute;
beforeEach(() => {
  pool = {
    query: jest.fn()
      .mockResolvedValueOnce({ rows: [{ database_name: 'forge_test', authorized: true }] })
      .mockResolvedValueOnce({ rows: [permitted] }),
    end: jest.fn().mockResolvedValue()
  };
  createPool = jest.fn().mockReturnValue(pool);
  execute = jest.fn().mockReturnValue({ status: 0 });
});

test('runs only after external marker authorization, with safe direct process invocation', async () => {
  expect(await runAuthorizedExecutionRegistryIntegration({ env, createPool, execute }))
    .toEqual({ passed: true, certificationAuthorized: false, installable: false });
  expect(pool.query).toHaveBeenCalledTimes(2);
  expect(pool.query.mock.calls.every(([sql]) => /^\s*SELECT/i.test(sql))).toBe(true);
  expect(pool.end).toHaveBeenCalledTimes(1);
  expect(execute).toHaveBeenCalledTimes(1);
  const [command, args, options] = execute.mock.calls[0];
  expect(command).toBe(process.execPath);
  expect(args).toContain('--runTestsByPath');
  expect(args.some(arg => arg.endsWith('studio-postgres-execution-registry.integration.test.js')))
    .toBe(true);
  expect(options.shell).toBe(false);
  expect(options.env.SBN_FORGE_RUN_EXECUTION_REGISTRY_PG_INTEGRATION).toBe('1');
});

test('refuses missing approval and wrong database without touching PostgreSQL', async () => {
  await expect(runAuthorizedExecutionRegistryIntegration({
    env: { ...env, SBN_FORGE_EXECUTION_REGISTRY_RUN_APPROVED: '0' }, createPool, execute
  })).rejects.toThrow('EXPLICIT_EXECUTION_REGISTRY_RUN_APPROVAL_REQUIRED');
  await expect(runAuthorizedExecutionRegistryIntegration({
    env: { ...env, SBN_FORGE_EXECUTION_REGISTRY_EXPECTED_TEST_DATABASE: 'other_test' },
    createPool, execute
  })).rejects.toThrow('EXACT_TEST_DATABASE_CONFIRMATION_REQUIRED');
  expect(createPool).not.toHaveBeenCalled();
  expect(execute).not.toHaveBeenCalled();
});

test('missing external authorization blocks execution and closes connection', async () => {
  pool.query.mockReset().mockResolvedValue({ rows: [{ database_name: 'forge_test', authorized: false }] });
  await expect(runAuthorizedExecutionRegistryIntegration({ env, createPool, execute }))
    .rejects.toThrow('TEST_DATABASE_NOT_INDEPENDENTLY_AUTHORIZED');
  expect(pool.end).toHaveBeenCalledTimes(1);
  expect(execute).not.toHaveBeenCalled();
});

test('database errors and failing test process fail closed', async () => {
  pool.query.mockReset().mockRejectedValueOnce(new Error('offline'));
  await expect(runAuthorizedExecutionRegistryIntegration({ env, createPool, execute }))
    .rejects.toThrow('offline');
  expect(execute).not.toHaveBeenCalled();
  pool.query.mockReset()
    .mockResolvedValueOnce({ rows: [{ database_name: 'forge_test', authorized: true }] })
    .mockResolvedValueOnce({ rows: [permitted] });
  execute.mockReturnValue({ status: 1 });
  await expect(runAuthorizedExecutionRegistryIntegration({ env, createPool, execute }))
    .rejects.toThrow('EXECUTION_REGISTRY_INTEGRATION_FAILED');
});

test('no approval is inferred from existing integration flag', async () => {
  await expect(runAuthorizedExecutionRegistryIntegration({
    env: { ...env, SBN_FORGE_EXECUTION_REGISTRY_RUN_APPROVED: undefined,
      SBN_FORGE_RUN_EXECUTION_REGISTRY_PG_INTEGRATION: '1' },
    createPool, execute
  })).rejects.toThrow('EXPLICIT_EXECUTION_REGISTRY_RUN_APPROVAL_REQUIRED');
  expect(execute).not.toHaveBeenCalled();
});

test.each([
  ['writable authorization marker', { ...permitted, can_write_marker: true }],
  ['no schema creation permission', { ...permitted, can_create_schema: false }],
  ['wrong connected database', { ...permitted, database_name: 'production' }],
  ['privileged login', { ...permitted, privileged_role: true }],
  ['public schema writable', { ...permitted, public_create: true }],
  ['authorization marker DDL', { ...permitted, can_alter_marker: true }]
])('blocks integration when preflight detects %s', async (_, unsafeRow) => {
  pool.query.mockReset()
    .mockResolvedValueOnce({ rows: [{ database_name: 'forge_test', authorized: true }] })
    .mockResolvedValueOnce({ rows: [unsafeRow] });
  await expect(runAuthorizedExecutionRegistryIntegration({ env, createPool, execute }))
    .rejects.toThrow('TEST_DATABASE_PRIVILEGE_POLICY_NOT_MET');
  expect(execute).not.toHaveBeenCalled();
  expect(pool.end).toHaveBeenCalledTimes(1);
});
