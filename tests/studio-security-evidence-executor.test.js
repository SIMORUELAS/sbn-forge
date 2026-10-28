'use strict';
const { executeSecurityEvidence, SUITES } = require('../studio/security-evidence-executor');

test('executor requires dedicated test database and never runs without it', async () => {
  const base = { repoRoot: process.cwd(), artifactRoot: process.cwd(), artifacts: [], checks: [] };
  await expect(executeSecurityEvidence(base)).rejects.toThrow('DEDICATED_TEST_DATABASE_REQUIRED');
  await expect(executeSecurityEvidence({ ...base, databaseUrl: 'postgresql://localhost/production' }))
    .rejects.toThrow('DEDICATED_TEST_DATABASE_REQUIRED');
  expect(Object.keys(SUITES)).toEqual(['postgresqlTenantIsolation', 'jwtCrudIntegration']);
});
