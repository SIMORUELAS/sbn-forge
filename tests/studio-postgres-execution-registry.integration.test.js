'use strict';
const crypto = require('node:crypto');
const { Pool } = require('pg');
const { SCHEMA_SQL, createPostgresExecutionRegistry } = require('../studio/postgres-execution-registry');
const { publicKeyFingerprint } = require('../studio/registered-execution-verifier');
const { requireDedicatedTestDatabase } = require('../studio/execution-registry-test-guard');
const { inspectExecutionRegistryTestEnvironment } = require('../studio/execution-registry-environment-preflight');

const enabled = process.env.SBN_FORGE_RUN_EXECUTION_REGISTRY_PG_INTEGRATION === '1';
const databaseUrl = process.env.SBN_FORGE_EXECUTION_REGISTRY_TEST_DATABASE_URL;
const suite = enabled ? describe : describe.skip;


suite('PostgreSQL execution registry integration (dedicated test database only)', () => {
  let pool, registry, runnerId, keys;
  const expectedDatabase = process.env.SBN_FORGE_EXECUTION_REGISTRY_EXPECTED_TEST_DATABASE;
  const details = {
    fingerprint: 'a'.repeat(64), evidenceDigest: 'b'.repeat(64),
    issuedAt: '2026-11-04T15:01:00.000Z'
  };
  const runId = 'run_0123456789abcdef';

  beforeAll(async () => {
    pool = new Pool({
      connectionString: requireDedicatedTestDatabase(databaseUrl, expectedDatabase),
      max: 5, connectionTimeoutMillis: 5000
    });
    try {
      if (process.env.SBN_FORGE_EXECUTION_REGISTRY_RUN_APPROVED !== '1') {
        throw new Error('EXPLICIT_EXECUTION_REGISTRY_RUN_APPROVAL_REQUIRED');
      }
      // Recheck authorization and restricted-role privileges even if Jest is run directly.
      await inspectExecutionRegistryTestEnvironment();
      await pool.query(SCHEMA_SQL);
      registry = createPostgresExecutionRegistry(pool);
    } catch (error) {
      await pool.end();
      throw error;
    }
  });

  beforeEach(async () => {
    runnerId = 'integration_' + crypto.randomBytes(12).toString('hex');
    keys = crypto.generateKeyPairSync('ed25519');
    await pool.query(
      `INSERT INTO forge_security.execution_runners
       (runner_id, active, public_key_pem, key_fingerprint) VALUES ($1, true, $2, $3)`,
      [runnerId, keys.publicKey.export({ type: 'spki', format: 'pem' }),
        publicKeyFingerprint(keys.publicKey)]
    );
  });

  afterEach(async () => {
    if (!pool || !runnerId) { return; }
    await pool.query('DELETE FROM forge_security.execution_receipt_claims WHERE runner_id = $1', [runnerId]);
    await pool.query('DELETE FROM forge_security.execution_runners WHERE runner_id = $1', [runnerId]);
  });

  afterAll(async () => {
    if (pool) { await pool.end(); }
  });

  test('two concurrent clients claim the same receipt exactly once', async () => {
    const results = await Promise.all(Array.from({ length: 12 }, () =>
      registry.claimRunId(runnerId, runId, details)));
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(results.filter(result => !result)).toHaveLength(11);
    const count = await pool.query(
      'SELECT count(*)::int AS total FROM forge_security.execution_receipt_claims WHERE runner_id=$1 AND run_id=$2',
      [runnerId, runId]
    );
    expect(count.rows[0].total).toBe(1);
  });

  test('claim persists across a fresh pool connection', async () => {
    expect(await registry.claimRunId(runnerId, runId, details)).toBe(true);
    const separatePool = new Pool({
      connectionString: requireDedicatedTestDatabase(databaseUrl, expectedDatabase), max: 1, connectionTimeoutMillis: 5000
    });
    try {
      const separate = createPostgresExecutionRegistry(separatePool);
      expect(await separate.claimRunId(runnerId, runId, details)).toBe(false);
      expect(await separate.getRunner(runnerId)).toMatchObject({
        active: true, keyFingerprint: publicKeyFingerprint(keys.publicKey)
      });
    } finally {
      await separatePool.end();
    }
  });

  test('revoked runner cannot claim a new receipt', async () => {
    await pool.query(
      'UPDATE forge_security.execution_runners SET active = false, updated_at = now() WHERE runner_id=$1',
      [runnerId]
    );
    expect((await registry.getRunner(runnerId)).active).toBe(false);
    expect(await registry.claimRunId(runnerId, runId, details)).toBe(false);
    const count = await pool.query(
      'SELECT count(*)::int AS total FROM forge_security.execution_receipt_claims WHERE runner_id=$1',
      [runnerId]
    );
    expect(count.rows[0].total).toBe(0);
  });
});

describe('dedicated database guard', () => {
  test('refuses production-like and invalid database names', () => {
    expect(() => requireDedicatedTestDatabase('postgres://localhost/forge', 'forge')).toThrow('UNSAFE_EXECUTION_REGISTRY_DATABASE_NAME');
    expect(() => requireDedicatedTestDatabase('postgres://localhost/postgres', 'postgres')).toThrow('UNSAFE_EXECUTION_REGISTRY_DATABASE_NAME');
    expect(() => requireDedicatedTestDatabase('postgres://localhost/forge_test', 'forge_test')).not.toThrow();
    expect(() => requireDedicatedTestDatabase('postgres://localhost/test_forge', 'test_forge')).not.toThrow();
  });
});
