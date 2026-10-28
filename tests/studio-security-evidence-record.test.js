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
