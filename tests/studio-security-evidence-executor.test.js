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

test('executor rejects incomplete source checks before starting either artifact suite', async () => {
  const { REQUIRED } = require('../studio/security-certification');
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-incomplete-checks-'));
  try {
    await fs.writeFile(path.join(root, 'tenant.test.js'), "test('tenant', () => {});");
    await fs.writeFile(path.join(root, 'jwt.test.js'), "test('jwt', () => {});");
    const base = {
      repoRoot: process.cwd(), artifactRoot: root,
      databaseUrl: 'postgresql://localhost/forge_test',
      suitePaths: { postgresqlTenantIsolation: 'tenant.test.js', jwtCrudIntegration: 'jwt.test.js' },
      artifacts: [{ path: 'tenant.test.js' }, { path: 'jwt.test.js' }]
    };
    const checks = REQUIRED.map(check => ({ check, status: 'passed' }));
    for (const status of ['missing', 'failed', 'pending']) {
      await expect(executeSecurityEvidence({
        ...base, checks: checks.map((item, index) => index === 0 ? { ...item, status } : item)
      })).rejects.toThrow('REQUIRED_SECURITY_CHECKS_NOT_PASSED');
    }
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('artifact Jest runner fails closed on failed, skipped, todo and empty suites', async () => {
  const { runJestSuite } = require('../studio/security-evidence-executor');
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-jest-negative-'));
  const cases = [
    ['failed', "test('fails', () => { throw new Error('failure'); });"],
    ['skipped', "test.skip('skipped', () => {});"],
    ['todo', "test.todo('todo');"],
    ['empty', "module.exports = {};"]
  ];
  try {
    for (const [name, source] of cases) {
      const suite = path.join(root, name + '.test.js');
      await fs.writeFile(suite, source);
      await expect(runJestSuite(process.cwd(), suite, {}, 30000))
        .rejects.toThrow('CERTIFICATION_SUITE_NOT_PASSED');
    }
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}, 150000);

test('artifact Jest runner rejects invalid timeouts without executing a suite', async () => {
  const { runJestSuite } = require('../studio/security-evidence-executor');
  for (const timeout of [0, -1, 999, 300001, NaN, 1000.5]) {
    await expect(runJestSuite(process.cwd(), 'not-executed.test.js', {}, timeout))
      .rejects.toThrow('INVALID_CERTIFICATION_TIMEOUT');
  }
});

test('artifact Jest runner accepts one fully executed passing suite', async () => {
  const { runJestSuite } = require('../studio/security-evidence-executor');
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-jest-positive-'));
  try {
    const suite = path.join(root, 'positive.test.js');
    await fs.writeFile(suite, "test('first', () => expect(2 + 2).toBe(4)); test('second', () => expect(true).toBe(true));");
    await expect(runJestSuite(process.cwd(), suite, {}, 30000)).resolves.toEqual({
      suite: 'positive.test.js', status: 'passed', passed: 2, failed: 0
    });
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}, 40000);

test('artifact Jest runner rejects suites that exceed their execution deadline', async () => {
  const { runJestSuite } = require('../studio/security-evidence-executor');
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-jest-timeout-'));
  try {
    const suite = path.join(root, 'timeout.test.js');
    await fs.writeFile(suite, "test('never completes', () => new Promise(() => {}), 30000);");
    await expect(runJestSuite(process.cwd(), suite, {}, 1000))
      .rejects.toThrow('CERTIFICATION_SUITE_NOT_PASSED');
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}, 15000);

test('artifact suite resolution rejects symlinks and nested path escapes', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-suite-boundary-'));
  const external = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-suite-outside-'));
  try {
    await fs.writeFile(path.join(root, 'valid.test.js'), "test('valid', () => {});");
    await fs.writeFile(path.join(external, 'outside.test.js'), "test('outside', () => {});");
    await expect(resolveArtifactSuites(root, {
      postgresqlTenantIsolation: '../' + path.basename(external) + '/outside.test.js',
      jwtCrudIntegration: 'valid.test.js'
    })).rejects.toThrow('INVALID_ARTIFACT_SUITE_PATH');
    const linked = path.join(root, 'linked.test.js');
    try {
      await fs.symlink(path.join(external, 'outside.test.js'), linked);
      await expect(resolveArtifactSuites(root, {
        postgresqlTenantIsolation: 'linked.test.js',
        jwtCrudIntegration: 'valid.test.js'
      })).rejects.toThrow('INVALID_ARTIFACT_SUITE');
    } catch (error) {
      if (!['EPERM', 'EACCES', 'ENOTSUP'].includes(error.code)) throw error;
    }
  } finally {
    await fs.rm(root, { recursive: true, force: true });
    await fs.rm(external, { recursive: true, force: true });
  }
});

test('artifact suite resolver rejects duplicate canonical paths despite different relative spellings', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-canonical-suites-'));
  try {
    await fs.mkdir(path.join(root, 'nested'));
    await fs.writeFile(path.join(root, 'tenant.test.js'), "test('tenant', () => {});");
    await expect(resolveArtifactSuites(root, {
      postgresqlTenantIsolation: 'tenant.test.js',
      jwtCrudIntegration: 'nested/../tenant.test.js'
    })).rejects.toThrow('DUPLICATE_ARTIFACT_SUITE');
    await fs.writeFile(path.join(root, 'jwt.test.js'), "test('jwt', () => {});");
    const resolved = await resolveArtifactSuites(root, {
      postgresqlTenantIsolation: 'tenant.test.js',
      jwtCrudIntegration: 'jwt.test.js'
    });
    expect(resolved.postgresqlTenantIsolation).toBe(await fs.realpath(path.join(root, 'tenant.test.js')));
    expect(resolved.jwtCrudIntegration).toBe(await fs.realpath(path.join(root, 'jwt.test.js')));
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('artifact Jest runner rejects partially executed suites with passing and skipped assertions', async () => {
  const { runJestSuite } = require('../studio/security-evidence-executor');
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-jest-partial-'));
  try {
    const suite = path.join(root, 'partial.test.js');
    await fs.writeFile(suite,
      "test('passes', () => expect(true).toBe(true)); test.skip('unverified tenant case', () => {});");
    await expect(runJestSuite(process.cwd(), suite, {}, 30000))
      .rejects.toThrow('CERTIFICATION_SUITE_NOT_PASSED');
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}, 40000);

test('Jest certification reports the exact suite path that was executed', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-suite-report-'));
  try {
    const suite = path.join(root, 'identity.test.js');
    await fs.writeFile(suite, "test('identity', () => expect(true).toBe(true));");
    const result = await runJestSuite(process.cwd(), suite, {}, 30000);
    expect(result).toMatchObject({ suite: 'identity.test.js', status: 'passed', passed: 1 });
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}, 40000);
