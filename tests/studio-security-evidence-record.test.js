'use strict';
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createEvidenceRecord, readEvidenceRecord } = require('../studio/security-evidence-record');

const evidence = {
  fingerprint: 'a'.repeat(64),
  executedAt: '2026-10-28T12:00:00.000Z',
  runner: 'local-jest',
  tests: {
    postgresqlTenantIsolation: { suite: 'tenant-pg', status: 'passed', passed: 3, failed: 0 },
    jwtCrudIntegration: { suite: 'jwt-http', status: 'passed', passed: 2, failed: 0 }
  }
};

test('evidence is unverified and detects modification', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-evidence-'));
  try {
    const record = createEvidenceRecord(evidence);
    expect(record.trust).toBe('unverified');
    expect(record.digest).toMatch(/^[a-f0-9]{64}$/);
    await fs.writeFile(path.join(root, 'evidence.json'), JSON.stringify(record));
    expect((await readEvidenceRecord(root, 'evidence.json')).digest).toBe(record.digest);
    await fs.writeFile(path.join(root, 'evidence.json'), JSON.stringify({ ...record, runner: 'modified' }));
    await expect(readEvidenceRecord(root, 'evidence.json')).rejects.toThrow('EVIDENCE_DIGEST_MISMATCH');
    await expect(readEvidenceRecord(root, '../outside.json')).rejects.toThrow('INVALID_EVIDENCE_PATH');
    expect(() => createEvidenceRecord({ ...evidence, tests: { ...evidence.tests, jwtCrudIntegration: { suite: 'jwt', status: 'failed', passed: 0, failed: 1 } } }))
      .toThrow('INCOMPLETE_CERTIFICATION_EVIDENCE');
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('evidence cannot reuse a single suite to satisfy PostgreSQL and JWT checks', async () => {
  const duplicated = {
    ...evidence,
    tests: {
      ...evidence.tests,
      jwtCrudIntegration: { suite: evidence.tests.postgresqlTenantIsolation.suite, status: 'passed', passed: 2, failed: 0 }
    }
  };
  expect(() => createEvidenceRecord(duplicated))
    .toThrow('DUPLICATE_CERTIFICATION_EVIDENCE_SUITE');
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-evidence-duplicate-'));
  try {
    await fs.writeFile(path.join(root, 'duplicate.json'), JSON.stringify({
      ...duplicated, digest: 'a'.repeat(64), trust: 'verified'
    }));
    await expect(readEvidenceRecord(root, 'duplicate.json'))
      .rejects.toThrow('DUPLICATE_CERTIFICATION_EVIDENCE_SUITE');
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('evidence rejects partial, pending and invalid test counts', () => {
  const variants = [
    { status: 'pending', passed: 1, failed: 0, suite: 'jwt-http' },
    { status: 'passed', passed: 0, failed: 0, suite: 'jwt-http' },
    { status: 'passed', passed: 1, failed: 1, suite: 'jwt-http' },
    { status: 'passed', passed: 1.5, failed: 0, suite: 'jwt-http' },
    { status: 'passed', passed: 1, failed: 0, suite: '' }
  ];
  for (const invalid of variants) {
    expect(() => createEvidenceRecord({
      ...evidence, tests: { ...evidence.tests, jwtCrudIntegration: invalid }
    })).toThrow('INCOMPLETE_CERTIFICATION_EVIDENCE');
  }
  expect(() => createEvidenceRecord({
    ...evidence, tests: { postgresqlTenantIsolation: evidence.tests.postgresqlTenantIsolation }
  })).toThrow('INCOMPLETE_CERTIFICATION_EVIDENCE');
});

test('read evidence always remains unverified even if a stored record claims trust', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-evidence-trust-'));
  try {
    const record = createEvidenceRecord(evidence);
    await fs.writeFile(path.join(root, 'evidence.json'), JSON.stringify({ ...record, trust: 'verified' }));
    const loaded = await readEvidenceRecord(root, 'evidence.json');
    expect(loaded.trust).toBe('unverified');
    expect(loaded.digest).toBe(record.digest);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
