'use strict';

// PostgreSQL adapter for an externally administered security database.
// Never creates schema, connects, or modifies a database at module import.
const SCHEMA_SQL = `
CREATE SCHEMA IF NOT EXISTS forge_security;
CREATE TABLE IF NOT EXISTS forge_security.execution_runners (
  runner_id text PRIMARY KEY,
  active boolean NOT NULL DEFAULT false,
  public_key_pem text NOT NULL,
  key_fingerprint char(64) NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT runner_id_format CHECK (runner_id ~ '^[A-Za-z0-9_-]{3,128}$'),
  CONSTRAINT runner_key_fingerprint_format CHECK (key_fingerprint ~ '^[a-f0-9]{64}$')
);
CREATE TABLE IF NOT EXISTS forge_security.execution_receipt_claims (
  runner_id text NOT NULL REFERENCES forge_security.execution_runners(runner_id),
  run_id text NOT NULL,
  fingerprint char(64) NOT NULL,
  evidence_digest char(64) NOT NULL,
  issued_at timestamptz NOT NULL,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (runner_id, run_id),
  CONSTRAINT run_id_format CHECK (run_id ~ '^[A-Za-z0-9_-]{16,128}$'),
  CONSTRAINT claim_fingerprint_format CHECK (fingerprint ~ '^[a-f0-9]{64}$'),
  CONSTRAINT claim_digest_format CHECK (evidence_digest ~ '^[a-f0-9]{64}$')
);
`;

// The calling service supplies an already configured, least-privilege pg Pool.
// Administrative provisioning and key rotation are intentionally out of scope.
function createPostgresExecutionRegistry(pool) {
  if (!pool || typeof pool.query !== 'function') throw new Error('POSTGRES_POOL_REQUIRED');
  return {
    async getRunner(runnerId) {
      if (typeof runnerId !== 'string' || !/^[A-Za-z0-9_-]{3,128}$/.test(runnerId)) {
        throw new Error('INVALID_RUNNER_ID');
      }
      const result = await pool.query(
        'SELECT active, public_key_pem, key_fingerprint FROM forge_security.execution_runners WHERE runner_id = $1',
        [runnerId]
      );
      if (!result || !Array.isArray(result.rows)) throw new Error('INVALID_REGISTRY_RESULT');
      const row = result.rows[0];
      return row ? {
        active: row.active === true,
        publicKey: row.public_key_pem,
        keyFingerprint: row.key_fingerprint
      } : null;
    },
    async claimRunId(runnerId, runId, details) {
      if (typeof runnerId !== 'string' || !/^[A-Za-z0-9_-]{3,128}$/.test(runnerId) ||
          typeof runId !== 'string' || !/^[A-Za-z0-9_-]{16,128}$/.test(runId) ||
          !details || !/^[a-f0-9]{64}$/.test(details.fingerprint || '') ||
          !/^[a-f0-9]{64}$/.test(details.evidenceDigest || '') ||
          typeof details.issuedAt !== 'string' ||
          !Number.isFinite(Date.parse(details.issuedAt))) {
        throw new Error('INVALID_EXECUTION_CLAIM');
      }
      // Atomic claim; concurrently repeated receipts can only insert once.
      // The active-runner predicate is checked again in the same SQL statement.
      const result = await pool.query(
        `INSERT INTO forge_security.execution_receipt_claims
          (runner_id, run_id, fingerprint, evidence_digest, issued_at)
         SELECT runner_id, $2, $3, $4, $5::timestamptz
         FROM forge_security.execution_runners
         WHERE runner_id = $1 AND active = true
         ON CONFLICT (runner_id, run_id) DO NOTHING
         RETURNING run_id`,
        [runnerId, runId, details.fingerprint, details.evidenceDigest, details.issuedAt]
      );
      if (!result || !Array.isArray(result.rows)) throw new Error('INVALID_CLAIM_RESULT');
      return result.rows.length === 1;
    }
  };
}

module.exports = { SCHEMA_SQL, createPostgresExecutionRegistry };
