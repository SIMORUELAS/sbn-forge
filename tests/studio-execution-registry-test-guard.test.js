'use strict';
const { requireDedicatedTestDatabase, assertAuthorizedTestDatabase } =
  require('../studio/execution-registry-test-guard');

test('requires exact independent database name and PostgreSQL protocol', () => {
  expect(requireDedicatedTestDatabase('postgres://localhost/forge_test', 'forge_test'))
    .toBe('postgres://localhost/forge_test');
  expect(() => requireDedicatedTestDatabase('postgres://localhost/forge_test', 'other_test'))
    .toThrow('EXACT_TEST_DATABASE_CONFIRMATION_REQUIRED');
  expect(() => requireDedicatedTestDatabase('postgres://localhost/forge_test'))
    .toThrow('EXACT_TEST_DATABASE_CONFIRMATION_REQUIRED');
  expect(() => requireDedicatedTestDatabase('postgres://localhost/forge', 'forge'))
    .toThrow('UNSAFE_EXECUTION_REGISTRY_DATABASE_NAME');
  expect(() => requireDedicatedTestDatabase('https://localhost/forge_test', 'forge_test'))
    .toThrow('POSTGRESQL_TEST_DATABASE_REQUIRED');
});

test('authorizes only matching database with pre-existing enabled marker', async () => {
  const pool = { query: jest.fn().mockResolvedValue({
    rows: [{ database_name: 'forge_test', authorized: true }]
  }) };
  await expect(assertAuthorizedTestDatabase(pool, 'forge_test')).resolves.toBe(true);
  expect(pool.query.mock.calls[0][0]).toContain('sbn_forge_execution_registry_test_authorization');
  expect(pool.query.mock.calls[0][0]).not.toMatch(/CREATE|INSERT|UPDATE|DELETE/i);
});

test('rejects missing marker, mismatched database and false authorization', async () => {
  const pool = { query: jest.fn() };
  for (const rows of [
    [{ database_name: 'forge_test', authorized: false }],
    [{ database_name: 'production', authorized: true }],
    []
  ]) {
    pool.query.mockResolvedValue({ rows });
    await expect(assertAuthorizedTestDatabase(pool, 'forge_test'))
      .rejects.toThrow('TEST_DATABASE_NOT_INDEPENDENTLY_AUTHORIZED');
  }
});

test('missing marker table or database outage fails closed', async () => {
  const pool = { query: jest.fn().mockRejectedValue(new Error('relation does not exist')) };
  await expect(assertAuthorizedTestDatabase(pool, 'forge_test'))
    .rejects.toThrow('relation does not exist');
  await expect(assertAuthorizedTestDatabase(null, 'forge_test'))
    .rejects.toThrow('TEST_DATABASE_AUTHORIZATION_REQUIRED');
});
