'use strict';
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');

const TESTS = Object.freeze(['postgresqlTenantIsolation', 'jwtCrudIntegration']);
const SHA256 = /^[a-f0-9]{64}$/;

function validateRecord(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record) ||
    !SHA256.test(record.fingerprint || '') ||
    typeof record.executedAt !== 'string' ||
    !Number.isFinite(Date.parse(record.executedAt)) ||
    typeof record.runner !== 'string' || !record.runner.trim() ||
    !record.tests || typeof record.tests !== 'object' || Array.isArray(record.tests)) {
    throw new Error('INVALID_CERTIFICATION_EVIDENCE');
  }
  for (const name of TESTS) {
    const test = record.tests[name];
    if (!test || test.status !== 'passed' || !Number.isInteger(test.passed) ||
      test.passed < 1 || !Number.isInteger(test.failed) || test.failed !== 0 ||
      typeof test.suite !== 'string' || !test.suite.trim()) {
      throw new Error('INCOMPLETE_CERTIFICATION_EVIDENCE');
    }
  }
  return {
    version: 1,
    fingerprint: record.fingerprint,
    executedAt: record.executedAt,
    runner: record.runner,
    tests: Object.fromEntries(TESTS.map(name => [name, {
      suite: record.tests[name].suite,
      status: 'passed',
      passed: record.tests[name].passed,
      failed: 0
    }]))
  };
}

function createEvidenceRecord(record) {
  const normalized = validateRecord(record);
  const digest = crypto.createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
  return { ...normalized, digest, trust: 'unverified' };
}

async function readEvidenceRecord(directory, filename) {
  const root = path.resolve(directory);
  const full = path.resolve(root, filename);
  if (!full.startsWith(root + path.sep)) {
    throw new Error('INVALID_EVIDENCE_PATH');
  }
  const stat = await fs.lstat(full);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 32 * 1024) {
    throw new Error('INVALID_EVIDENCE_FILE');
  }
  const raw = JSON.parse(await fs.readFile(full, 'utf8'));
  const verified = createEvidenceRecord(raw);
  if (raw.digest !== verified.digest) {
    throw new Error('EVIDENCE_DIGEST_MISMATCH');
  }
  return verified;
}

module.exports = { TESTS, createEvidenceRecord, readEvidenceRecord };
