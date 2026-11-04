'use strict';
const { SCHEMA_SQL, createPostgresExecutionRegistry } = require('../studio/postgres-execution-registry');

const fingerprint = 'a'.repeat(64);
const digest = 'b'.repeat(64);
const details = { fingerprint, evidenceDigest: digest, issuedAt: '2026-11-04T15:01:00.000Z' };
let pool, registry;
beforeEach(() => {
  pool = { query: jest.fn() };
  registry = createPostgresExecutionRegistry(pool);
});

test('schema has durable runner registry, audit columns and composite replay uniqueness', () => {
  expect(SCHEMA_SQL).toContain('CREATE TABLE IF NOT EXISTS forge_security.execution_runners');
  expect(SCHEMA_SQL).toContain('CREATE TABLE IF NOT EXISTS forge_security.execution_receipt_claims');
  expect(SCHEMA_SQL).toContain('PRIMARY KEY (runner_id, run_id)');
  expect(SCHEMA_SQL).toContain('claimed_at timestamptz');
  expect(SCHEMA_SQL).not.toContain('private_key');
});

test('lookup uses parameterized runner identity and returns only public trust material', async () => {
  pool.query.mockResolvedValue({ rows: [{
    active: true, public_key_pem: 'public-key', key_fingerprint: fingerprint
  }] });
  expect(await registry.getRunner('runner_1')).toEqual({
    active: true, publicKey: 'public-key', keyFingerprint: fingerprint
  });
  expect(pool.query.mock.calls[0][1]).toEqual(['runner_1']);
  pool.query.mockResolvedValue({ rows: [] });
  expect(await registry.getRunner('unknown')).toBeNull();
});

test('claim is atomic, parameterized and returns false for duplicate', async () => {
  pool.query.mockResolvedValueOnce({ rows: [{ run_id: 'run_0123456789abcdef' }] })
    .mockResolvedValueOnce({ rows: [] });
  expect(await registry.claimRunId('runner_1', 'run_0123456789abcdef', details)).toBe(true);
  expect(await registry.claimRunId('runner_1', 'run_0123456789abcdef', details)).toBe(false);
  const [sql, params] = pool.query.mock.calls[0];
  expect(sql).toContain('ON CONFLICT (runner_id, run_id) DO NOTHING');
  expect(sql).toContain('active = true');
  expect(params).toEqual(['runner_1', 'run_0123456789abcdef',
    fingerprint, digest, details.issuedAt]);
});

test('invalid inputs are rejected without querying database', async () => {
  await expect(registry.getRunner('../bad')).rejects.toThrow('INVALID_RUNNER_ID');
  await expect(registry.claimRunId('runner_1', 'short', details))
    .rejects.toThrow('INVALID_EXECUTION_CLAIM');
  await expect(registry.claimRunId('runner_1', 'run_0123456789abcdef',
    { ...details, fingerprint: 'wrong' })).rejects.toThrow('INVALID_EXECUTION_CLAIM');
  expect(pool.query).not.toHaveBeenCalled();
});

test('database errors propagate, never treated as successful claims', async () => {
  pool.query.mockRejectedValue(new Error('database offline'));
  await expect(registry.claimRunId('runner_1', 'run_0123456789abcdef', details))
    .rejects.toThrow('database offline');
  await expect(registry.getRunner('runner_1')).rejects.toThrow('database offline');
});
