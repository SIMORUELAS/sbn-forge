'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { spawn } = require('node:child_process');
const { assessSecurityCertification } = require('./security-certification');
const { createEvidenceRecord } = require('./security-evidence-record');

const SUITES = Object.freeze({
  postgresqlTenantIsolation: 'tests/studio-generated-tenant-postgresql.integration.test.js',
  jwtCrudIntegration: 'tests/studio-generated-fastify-jwt.integration.test.js'
});

function runJestSuite(repoRoot, suite, env, timeoutMs) {
  return new Promise((resolve, reject) => {
    const executable = require.resolve('jest/bin/jest', { paths: [repoRoot] });
    const child = spawn(process.execPath, [executable, suite, '--runInBand', '--no-cache', '--json', '--outputFile=' + path.join(os.tmpdir(), '.forge-certification-' + process.pid + '-' + suite.replace(/[^a-z0-9]/gi, '_') + '.json')], {
      cwd: repoRoot, env: { ...process.env, ...env }, stdio: ['ignore', 'ignore', 'ignore'], windowsHide: true
    });
    const output = path.join(os.tmpdir(), '.forge-certification-' + process.pid + '-' + suite.replace(/[^a-z0-9]/gi, '_') + '.json');
    const timer = setTimeout(() => child.kill(), timeoutMs);
    child.once('error', reject);
    child.once('close', async code => {
      clearTimeout(timer);
      try {
        const report = JSON.parse(await fs.readFile(output, 'utf8'));
        if (code !== 0 || report.numFailedTests !== 0 || report.numPendingTests !== 0 ||
          report.numPassedTests < 1 || report.numTotalTestSuites !== 1) {
          reject(new Error('CERTIFICATION_SUITE_NOT_PASSED: ' + suite));
          return;
        }
        resolve({ suite, status: 'passed', passed: report.numPassedTests, failed: 0 });
      } catch (error) {
        reject(error);
      } finally {
        await fs.rm(output, { force: true });
      }
    });
  });
}

async function executeSecurityEvidence({ repoRoot, artifactRoot, artifacts, checks, databaseUrl, timeoutMs = 60000 }) {
  if (!databaseUrl || !/(^test$|_test$|^test_)/i.test(new URL(databaseUrl).pathname.slice(1))) {
    throw new Error('DEDICATED_TEST_DATABASE_REQUIRED');
  }
  const before = await assessSecurityCertification(artifactRoot, artifacts, checks);
  if (!before.fingerprint) {
    throw new Error('ARTIFACT_FINGERPRINT_REQUIRED');
  }
  const tests = {};
  for (const [name, suite] of Object.entries(SUITES)) {
    tests[name] = await runJestSuite(repoRoot, suite, {
      SBN_FORGE_RUN_TENANT_PG_INTEGRATION: '1',
      SBN_FORGE_TENANT_TEST_DATABASE_URL: databaseUrl
    }, timeoutMs);
  }
  const after = await assessSecurityCertification(artifactRoot, artifacts, checks);
  if (before.fingerprint !== after.fingerprint) {
    throw new Error('ARTIFACT_CHANGED_DURING_CERTIFICATION');
  }
  return createEvidenceRecord({
    fingerprint: after.fingerprint,
    executedAt: new Date().toISOString(),
    runner: 'sbn-forge-local-jest',
    tests
  });
}

module.exports = { executeSecurityEvidence, SUITES };
