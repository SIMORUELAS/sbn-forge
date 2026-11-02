'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { spawn } = require('node:child_process');
const { assessSecurityCertification } = require('./security-certification');
const { createEvidenceRecord } = require('./security-evidence-record');

const SUITES = Object.freeze(['postgresqlTenantIsolation', 'jwtCrudIntegration']);

async function resolveArtifactSuites(artifactRoot, suitePaths) {
  const root = await fs.realpath(artifactRoot);
  const resolved = {};
  const seen = new Set();
  for (const name of SUITES) {
    const relative = suitePaths?.[name];
    if (typeof relative !== 'string' || !relative.endsWith('.test.js') || path.isAbsolute(relative)) {
      throw new Error('ARTIFACT_SPECIFIC_SUITE_REQUIRED: ' + name);
    }
    const full = path.resolve(root, relative);
    if (!full.startsWith(root + path.sep)) {
      throw new Error('INVALID_ARTIFACT_SUITE_PATH');
    }
    let stat;
    try {
      stat = await fs.lstat(full);
      if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 128 * 1024 ||
        !(await fs.realpath(full)).startsWith(root + path.sep)) {
        throw new Error('INVALID_ARTIFACT_SUITE');
      }
    } catch {
      throw new Error('INVALID_ARTIFACT_SUITE');
    }
    if (seen.has(full)) {
      throw new Error('DUPLICATE_ARTIFACT_SUITE');
    }
    seen.add(full);
    resolved[name] = full;
  }
  return resolved;
}

async function runJestSuite(repoRoot, suite, env, timeoutMs) {
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 300000) {
    throw new Error('INVALID_CERTIFICATION_TIMEOUT');
  }
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-certification-'));
  const output = path.join(temporary, 'jest-report.json');
  let timedOut = false;
  try {
    const executable = require.resolve('jest/bin/jest', { paths: [repoRoot] });
    const code = await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [
        executable, '--config', JSON.stringify({ rootDir: path.dirname(suite), testMatch: ['**/*.test.js'] }),
        '--runTestsByPath', suite, '--runInBand', '--no-cache',
        '--json', '--outputFile=' + output
      ], {
        cwd: repoRoot, env: { ...process.env, ...env },
        stdio: ['ignore', 'ignore', 'ignore'], windowsHide: true
      });
      const timer = setTimeout(() => {
        timedOut = true;
        child.kill();
      }, timeoutMs);
      child.once('error', error => { clearTimeout(timer); reject(error); });
      child.once('close', exitCode => { clearTimeout(timer); resolve(exitCode); });
    });
    if (timedOut || code !== 0) {
      throw new Error('CERTIFICATION_SUITE_NOT_PASSED: ' + suite);
    }
    const report = JSON.parse(await fs.readFile(output, 'utf8'));
    if (report.success !== true || report.numFailedTests !== 0 ||
      report.numPendingTests !== 0 || report.numPassedTests < 1 ||
      report.numTotalTestSuites !== 1 || report.numPassedTestSuites !== 1 ||
      report.numPendingTestSuites !== 0 || report.numFailedTestSuites !== 0 ||
      !Array.isArray(report.testResults) || report.testResults.length !== 1 ||
      report.testResults[0].status !== 'passed') {
      throw new Error('CERTIFICATION_SUITE_NOT_PASSED: ' + suite);
    }
    return { suite: path.basename(suite), status: 'passed', passed: report.numPassedTests, failed: 0 };
  } finally {
    await fs.rm(temporary, { recursive: true, force: true });
  }
}

async function executeSecurityEvidence({ repoRoot, artifactRoot, artifacts, checks, databaseUrl, suitePaths, timeoutMs = 60000 }) {
  let databaseName;
  try {
    const url = new URL(databaseUrl);
    if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
      throw new Error('invalid protocol');
    }
    databaseName = decodeURIComponent(url.pathname.slice(1));
  } catch {
    throw new Error('DEDICATED_TEST_DATABASE_REQUIRED');
  }
  if (!/(^test$|_test$|^test_)/i.test(databaseName)) {
    throw new Error('DEDICATED_TEST_DATABASE_REQUIRED');
  }
  const artifactSuites = await resolveArtifactSuites(artifactRoot, suitePaths);
  if (!Array.isArray(artifacts) || artifacts.some(item => !item || typeof item.path !== 'string')) {
    throw new Error('INVALID_ARTIFACT_SET');
  }
  const declared = new Set(artifacts.map(item => item.path));
  for (const name of SUITES) {
    if (!declared.has(suitePaths[name])) {
      throw new Error('ARTIFACT_SUITE_NOT_FINGERPRINTED: ' + name);
    }
  }
  const before = await assessSecurityCertification(artifactRoot, artifacts, checks);
  if (!before.fingerprint) {
    throw new Error('ARTIFACT_FINGERPRINT_REQUIRED');
  }
  const tests = {};
  for (const [name, suite] of Object.entries(artifactSuites)) {
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
    runner: 'sbn-forge-artifact-jest-unverified',
    tests
  });
}

module.exports = { executeSecurityEvidence, resolveArtifactSuites, SUITES };
