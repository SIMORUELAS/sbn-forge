'use strict';
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { generateIsolated } = require('../studio/isolated-generation');
const { inspectArtifactIntegrationTargets, prepareArtifactJwtIntegrationSuite, prepareArtifactPostgresqlSuite } = require('../studio/artifact-integration-suites');

const metadata = { defaultValue: null, identity: false, maxLength: null, precision: null, scale: null };
const definition = {
  version: 1, name: 'integration_target_sample',
  source: { type: 'postgresql', schema: 'product_hub', table: 'integration_target_sample' },
  primaryKey: { name: 'integration_target_sample_pkey', columns: ['id'] }, foreignKeys: [],
  fields: [
    { name: 'id', dataType: 'uuid', nullable: false, visible: true, editable: false, required: false, ...metadata, defaultValue: 'gen_random_uuid()' },
    { name: 'organization_id', dataType: 'uuid', nullable: false, visible: true, editable: true, required: true, ...metadata },
    { name: 'name', dataType: 'text', nullable: false, visible: true, editable: true, required: true, ...metadata }
  ]
};

test('locates repository and routes belonging to the same isolated generated module', async () => {
  const parent = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-targets-'));
  try {
    const run = await generateIsolated(definition, { tempRoot: parent });
    const inspected = await inspectArtifactIntegrationTargets(run);
    expect(inspected.targets.repository).toMatch(/\.repository\.js$/);
    expect(inspected.targets.routes).toMatch(/\.routes\.js$/);
    expect(path.dirname(inspected.targets.repository)).toBe(path.dirname(inspected.targets.routes));
    expect(inspected.root).toBe(await fs.realpath(run.directory));
    await expect(inspectArtifactIntegrationTargets({ ...run, mode: 'published' }))
      .rejects.toThrow('ISOLATED_GENERATION_REQUIRED');
    await expect(inspectArtifactIntegrationTargets({
      ...run, artifacts: [...run.artifacts, run.artifacts.find(item => item.path.endsWith('.routes.js'))]
    })).rejects.toThrow('GENERATED_ARTIFACT_REQUIRED');
  } finally {
    await fs.rm(parent, { recursive: true, force: true });
  }
});

test('prepares a fingerprintable JWT CRUD suite beside generated routes', async () => {
  const parent = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-jwt-suite-'));
  try {
    const run = await generateIsolated(definition, { tempRoot: parent });
    const prepared = await prepareArtifactJwtIntegrationSuite(run);
    expect(prepared.installable).toBe(false);
    expect(prepared.integrationVerified).toBe(false);
    expect(prepared.artifacts).toHaveLength(run.artifacts.length + 1);
    const relative = prepared.suitePaths.jwtCrudIntegration;
    expect(relative).toMatch(/jwt-crud\.test\.js$/);
    const source = await fs.readFile(path.join(run.directory, relative), 'utf8');
    expect(source).toContain('authorizeOperation: async () => false');
    expect(source).toContain('expect(queries).toBe(0)');
    await expect(prepareArtifactJwtIntegrationSuite(run)).rejects.toMatchObject({ code: 'EEXIST' });
  } finally {
    await fs.rm(parent, { recursive: true, force: true });
  }
});

test('prepares dedicated PostgreSQL tenant suite and refuses unsupported models', async () => {
  const parent = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-pg-suite-'));
  try {
    const run = await generateIsolated(definition, { tempRoot: parent });
    const prepared = await prepareArtifactPostgresqlSuite(run, definition);
    expect(prepared.installable).toBe(false);
    expect(prepared.integrationVerified).toBe(false);
    expect(prepared.artifacts).toHaveLength(run.artifacts.length + 1);
    expect(prepared.suitePaths.postgresqlTenantIsolation).toMatch(/tenant-postgresql\.test\.js$/);
    const source = await fs.readFile(path.join(run.directory, prepared.suitePaths.postgresqlTenantIsolation), 'utf8');
    expect(source).toContain('CREATE SCHEMA');
    expect(source).toContain('TENANT_SCOPE_REQUIRED');
    expect(source).toContain('UNEXPECTED_GENERATED_SQL_TARGET');
    await expect(prepareArtifactPostgresqlSuite(run, definition)).rejects.toMatchObject({ code: 'EEXIST' });
    await expect(prepareArtifactPostgresqlSuite(run, { ...definition, fields: definition.fields.slice(0, 2) }))
      .rejects.toThrow('POSTGRESQL_SUITE_MODEL_UNSUPPORTED');
  } finally {
    await fs.rm(parent, { recursive: true, force: true });
  }
});
