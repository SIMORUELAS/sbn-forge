'use strict';
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { generateIsolated } = require('../studio/isolated-generation');
const { inspectArtifactIntegrationTargets, prepareArtifactJwtIntegrationSuite, prepareArtifactPostgresqlSuite, prepareArtifactIntegrationSuites } = require('../studio/artifact-integration-suites');

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
    expect(source).toContain("organization_id: '22222222-2222-4222-8222-222222222222'");
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
    expect(source).toContain('id uuid PRIMARY KEY DEFAULT gen_random_uuid()');
    expect(source).toContain('TENANT_SCOPE_REQUIRED');
    expect(source).toContain('UNEXPECTED_GENERATED_SQL_TARGET');
    expect(source).toContain('sql.indexOf(target, end) !== -1');
    expect(source).toContain('sql.slice(0, index)');
    expect(source).toContain('const id = created.id');
    expect(source).toContain('expect(created).toBeTruthy()');
    expect(source).toContain('product_hub.integration_target_sample');
    expect(source).not.toContain('"product_hub"."integration_target_sample"');
    expect(source).toContain('let schemaCreated = false');
    expect(source).toContain('schemaCreated = true');
    expect(source).toContain('if (schemaCreated) await client.query');
    expect(source).toContain('const requested = new URL(databaseUrl)');
    expect(source.indexOf('const requested = new URL(databaseUrl)')).toBeLessThan(source.indexOf('await client.connect()'));
    await expect(prepareArtifactPostgresqlSuite(run, definition)).rejects.toMatchObject({ code: 'EEXIST' });
    await expect(prepareArtifactPostgresqlSuite(run, { ...definition, fields: definition.fields.slice(0, 2) }))
      .rejects.toThrow('POSTGRESQL_SUITE_MODEL_UNSUPPORTED');
  } finally {
    await fs.rm(parent, { recursive: true, force: true });
  }
});

test('prepares both isolated suites as separate fingerprintable artifacts', async () => {
  const parent = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-both-suites-'));
  try {
    const run = await generateIsolated(definition, { tempRoot: parent });
    const result = await prepareArtifactIntegrationSuites(run, definition);
    expect(result.installable).toBe(false);
    expect(result.integrationVerified).toBe(false);
    expect(result.artifacts).toHaveLength(run.artifacts.length + 2);
    expect(result.suitePaths.postgresqlTenantIsolation).not.toBe(result.suitePaths.jwtCrudIntegration);
    for (const relative of Object.values(result.suitePaths)) {
      expect(result.artifacts.some(item => item.path === relative)).toBe(true);
      expect((await fs.stat(path.join(run.directory, relative))).size).toBeGreaterThan(0);
    }
    await expect(prepareArtifactIntegrationSuites(run, definition))
      .rejects.toThrow('ARTIFACT_SUITE_ALREADY_EXISTS');
  } finally {
    await fs.rm(parent, { recursive: true, force: true });
  }
});

test('unsupported models do not leave partially generated integration suites', async () => {
  const parent = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-both-reject-'));
  try {
    const run = await generateIsolated(definition, { tempRoot: parent });
    await expect(prepareArtifactIntegrationSuites(run, {
      ...definition, fields: definition.fields.slice(0, 2)
    })).rejects.toThrow('POSTGRESQL_SUITE_MODEL_UNSUPPORTED');
    const inspected = await inspectArtifactIntegrationTargets(run);
    await expect(fs.stat(path.join(inspected.root, inspected.folder, 'jwt-crud.test.js')))
      .rejects.toMatchObject({ code: 'ENOENT' });
  } finally {
    await fs.rm(parent, { recursive: true, force: true });
  }
});
