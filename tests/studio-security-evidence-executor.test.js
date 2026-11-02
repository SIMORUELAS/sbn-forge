'use strict';
const { executeSecurityEvidence, resolveArtifactSuites, SUITES } = require('../studio/security-evidence-executor');

test('executor requires dedicated test database and never runs without it', async () => {
  const base = { repoRoot: process.cwd(), artifactRoot: process.cwd(), artifacts: [], checks: [] };
  await expect(executeSecurityEvidence(base)).rejects.toThrow('DEDICATED_TEST_DATABASE_REQUIRED');
  await expect(executeSecurityEvidence({ ...base, databaseUrl: 'postgresql://localhost/production' }))
    .rejects.toThrow('DEDICATED_TEST_DATABASE_REQUIRED');
  expect(SUITES).toEqual(['postgresqlTenantIsolation', 'jwtCrudIntegration']);
});

const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

test('artifact certification rejects missing, external and generator-only test suites', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-artifact-suites-'));
  try {
    await expect(resolveArtifactSuites(root)).rejects.toThrow('ARTIFACT_SPECIFIC_SUITE_REQUIRED');
    await expect(resolveArtifactSuites(root, {
      postgresqlTenantIsolation: '../tests/studio-generated-tenant-postgresql.integration.test.js',
      jwtCrudIntegration: '../tests/studio-generated-fastify-jwt.integration.test.js'
    })).rejects.toThrow('INVALID_ARTIFACT_SUITE_PATH');
    await fs.writeFile(path.join(root, 'tenant.test.js'), 'test(\'placeholder\', () => {});');
    await expect(resolveArtifactSuites(root, {
      postgresqlTenantIsolation: 'tenant.test.js', jwtCrudIntegration: 'missing.test.js'
    })).rejects.toThrow('INVALID_ARTIFACT_SUITE');
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('malformed and non-PostgreSQL URLs cannot initiate certification', async () => {
  const base = { repoRoot: process.cwd(), artifactRoot: process.cwd(), artifacts: [], checks: [] };
  for (const databaseUrl of ['not a URL', 'https://localhost/forge_test', 'postgresql://localhost/production']) {
    await expect(executeSecurityEvidence({ ...base, databaseUrl }))
      .rejects.toThrow('DEDICATED_TEST_DATABASE_REQUIRED');
  }
});

test('artifact certification rejects reuse of one suite for two independent checks', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-duplicate-suites-'));
  try {
    await fs.writeFile(path.join(root, 'same.test.js'), "test('not sufficient', () => {});");
    await expect(resolveArtifactSuites(root, {
      postgresqlTenantIsolation: 'same.test.js',
      jwtCrudIntegration: 'same.test.js'
    })).rejects.toThrow('DUPLICATE_ARTIFACT_SUITE');
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('executor rejects missing roots and duplicated declarations before executing Jest', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-declarations-'));
  try {
    await fs.writeFile(path.join(root, 'tenant.test.js'), "test('tenant', () => {});");
    await fs.writeFile(path.join(root, 'jwt.test.js'), "test('jwt', () => {});");
    const base = {
      repoRoot: process.cwd(), artifactRoot: root, databaseUrl: 'postgresql://localhost/forge_test',
      suitePaths: { postgresqlTenantIsolation: 'tenant.test.js', jwtCrudIntegration: 'jwt.test.js' },
      artifacts: [{ path: 'tenant.test.js' }, { path: 'jwt.test.js' }], checks: []
    };
    await expect(executeSecurityEvidence({ ...base, repoRoot: '' }))
      .rejects.toThrow('INVALID_CERTIFICATION_ROOT');
    await expect(executeSecurityEvidence({ ...base, artifacts: [...base.artifacts, base.artifacts[0]] }))
      .rejects.toThrow('DUPLICATE_ARTIFACT_DECLARATION');
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('executor refuses to run certification when required source security checks are missing', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-check-gate-'));
  try {
    await fs.writeFile(path.join(root, 'tenant.test.js'), "test('tenant', () => {});");
    await fs.writeFile(path.join(root, 'jwt.test.js'), "test('jwt', () => {});");
    await expect(executeSecurityEvidence({
      repoRoot: process.cwd(), artifactRoot: root,
      databaseUrl: 'postgresql://localhost/forge_test',
      suitePaths: { postgresqlTenantIsolation: 'tenant.test.js', jwtCrudIntegration: 'jwt.test.js' },
      artifacts: [{ path: 'tenant.test.js' }, { path: 'jwt.test.js' }],
      checks: []
    })).rejects.toThrow('REQUIRED_SECURITY_CHECKS_NOT_PASSED');
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
