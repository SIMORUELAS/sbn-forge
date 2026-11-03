'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');

async function inspectArtifactIntegrationTargets(run) {
  if (!run || run.mode !== 'isolated-local' || run.published !== false ||
      run.databaseModified !== false || !Array.isArray(run.artifacts)) {
    throw new Error('ISOLATED_GENERATION_REQUIRED');
  }
  const root = await fs.realpath(run.directory);
  const targets = {};
  for (const [name, suffix] of Object.entries({ repository: '.repository.js', routes: '.routes.js' })) {
    const matching = run.artifacts.filter(item => typeof item.path === 'string' && item.path.endsWith(suffix));
    if (matching.length !== 1) throw new Error('GENERATED_ARTIFACT_REQUIRED: ' + suffix);
    const relative = matching[0].path;
    const absolute = path.resolve(root, relative);
    if (!absolute.startsWith(root + path.sep)) throw new Error('INVALID_GENERATED_ARTIFACT_PATH');
    const stat = await fs.lstat(absolute);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('INVALID_GENERATED_ARTIFACT');
    if (!(await fs.realpath(absolute)).startsWith(root + path.sep)) throw new Error('INVALID_GENERATED_ARTIFACT');
    targets[name] = relative;
  }
  if (path.dirname(targets.repository) !== path.dirname(targets.routes)) {
    throw new Error('ARTIFACT_MODULE_MISMATCH');
  }
  return { root, targets, folder: path.dirname(targets.repository) };
}


async function prepareArtifactJwtIntegrationSuite(run) {
  const { root, targets, folder } = await inspectArtifactIntegrationTargets(run);
  const relative = path.join(folder, 'jwt-crud.test.js');
  const routeName = path.basename(targets.routes);
  const source = [
    "'use strict';",
    "const { spawnSync } = require('node:child_process');",
    "const path = require('node:path');",
    "test('generated routes reject unauthenticated and unauthorized CRUD', () => {",
    "  const routePath = path.join(__dirname, " + JSON.stringify(routeName) + ");",
    "  const runner = async () => {",
    "    const assert = require('node:assert/strict');",
    "    const fs = require('node:fs');",
    "    const fastify = require('fastify');",
    "    const jwt = require('@fastify/jwt');",
    "    const routes = require(process.argv[1]);",
    "    const app = fastify({ logger: false });",
    "    let queries = 0;",
    "    try {",
    "      await app.register(jwt, { secret: 'isolated-forge-artifact-test-secret' });",
    "      await app.register(routes, {",
    "        database: { async query() { queries++; return { rows: [], rowCount: 0 }; } },",
    "        tenantColumn: 'organization_id', requireTenantIsolation: true,",
    "        requireCrudPermissions: true, authorizeOperation: async () => false",
    "      });",
    "      await app.ready();",
    "      const routeSource = fs.readFileSync(process.argv[1], 'utf8');",
    "      const base = routeSource.match(/const base\\s*=\\s*'([^']+)'/)?.[1];",
    "      assert.ok(base);",
    "      const id = '11111111-1111-4111-8111-111111111111';",
    "      const ops = [",
    "        { method: 'GET', url: base },",
    "        { method: 'GET', url: base + '/' + id },",
    "        { method: 'POST', url: base, payload: { name: 'test', organization_id: '22222222-2222-4222-8222-222222222222' } },",
    "        { method: 'PATCH', url: base + '/' + id, payload: { name: 'test' } },",
    "        { method: 'DELETE', url: base + '/' + id }",
    "      ];",
    "      const token = app.jwt.sign({ id: 'user-a', organization_id: 'org-a' });",
    "      for (const op of ops) {",
    "        assert.equal((await app.inject(op)).statusCode, 401);",
    "        const authorized = await app.inject({ ...op, headers: { authorization: 'Bearer ' + token } });",
    "        assert.equal(authorized.statusCode, 403, op.method + ' ' + op.url + ': ' + authorized.body);",
    "      }",
    "      assert.equal(queries, 0);",
    "      process.stdout.write(JSON.stringify({ operations: ops.length, queries }));",
    "    } finally { await app.close(); }",
    "  };",
    "  const child = spawnSync(process.execPath, ['-e', '(' + runner.toString() + ')().catch(e => { console.error(e); process.exitCode = 1; })', routePath],",
    "    { cwd: process.cwd(), encoding: 'utf8', timeout: 20000, windowsHide: true });",
    "  expect(child.error).toBeUndefined();",
    "  if (child.status !== 0) {",
    "    throw new Error('GENERATED_JWT_HTTP_CHECK_FAILED: exit=' + child.status +",
    "      ' signal=' + (child.signal || 'none') +",
    "      ' stderr=' + String(child.stderr || '').slice(0, 5000) +",
    "      ' stdout=' + String(child.stdout || '').slice(0, 1000));",
    "  }",
    "  expect(JSON.parse(child.stdout)).toEqual({ operations: 5, queries: 0 });",
    "}, 30000);"
  ].join('\n') + '\n';
  await fs.writeFile(path.resolve(root, relative), source, { flag: 'wx' });
  return {
    kind: 'artifact-jwt-integration-suite',
    installable: false, integrationVerified: false,
    suitePaths: { jwtCrudIntegration: relative },
    artifacts: [...run.artifacts, { path: relative, bytes: Buffer.byteLength(source) }]
  };
}

async function prepareArtifactPostgresqlSuite(run, definition) {
  const { root, targets, folder } = await inspectArtifactIntegrationTargets(run);
  const fields = definition?.fields;
  const supported = Array.isArray(fields) && fields.length === 3 &&
    ['id', 'organization_id', 'name'].every(name => fields.some(field => field.name === name)) &&
    fields.find(field => field.name === 'id').dataType === 'uuid' &&
    fields.find(field => field.name === 'organization_id').dataType === 'uuid' &&
    fields.find(field => field.name === 'name').dataType === 'text';
  if (!supported) throw new Error('POSTGRESQL_SUITE_MODEL_UNSUPPORTED');
  const sourceSchema = definition?.source?.schema;
  const sourceTable = definition?.source?.table;
  if (![sourceSchema, sourceTable].every(value => typeof value === 'string' && /^[a-z_][a-z0-9_]*$/i.test(value))) {
    throw new Error('INVALID_POSTGRESQL_ARTIFACT_SOURCE');
  }
  const relative = path.join(folder, 'tenant-postgresql.test.js');
  const repositoryName = path.basename(targets.repository);
  const source = [
    "'use strict';",
    "const { Client } = require('pg');",
    "const repository = require('./" + repositoryName + "');",
    "const databaseUrl = process.env.SBN_FORGE_TENANT_TEST_DATABASE_URL;",
    "test('artifact repository isolates tenants using dedicated PostgreSQL', async () => {",
    "  if (process.env.SBN_FORGE_RUN_TENANT_PG_INTEGRATION !== '1' || !databaseUrl) throw new Error('DEDICATED_TEST_DATABASE_REQUIRED');",
    "  const requested = new URL(databaseUrl);",
    "  if (!['postgres:', 'postgresql:'].includes(requested.protocol) ||",
    "      !/(^test$|_test$|^test_)/i.test(decodeURIComponent(requested.pathname.slice(1)))) {",
    "    throw new Error('DEDICATED_TEST_DATABASE_REQUIRED');",
    "  }",
    "  const client = new Client({ connectionString: databaseUrl, connectionTimeoutMillis: 5000 });",
    "  await client.connect();",
    "  const schema = 'forge_cert_' + process.pid + '_' + require('node:crypto').randomBytes(4).toString('hex');",
    "  const quoted = String.fromCharCode(34) + schema + String.fromCharCode(34);",
    "  let schemaCreated = false;",
    "  try {",
    "    const db = (await client.query('SELECT current_database() AS name')).rows[0].name;",
    "    if (!/(^test$|_test$|^test_)/i.test(db)) throw new Error('DEDICATED_TEST_DATABASE_REQUIRED');",
    "    await client.query('CREATE SCHEMA ' + quoted);",
    "    schemaCreated = true;",
    "    await client.query('CREATE TABLE ' + quoted + '.records (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL, name text NOT NULL)');",
    "    const proxy = { query(sql, values) {",
    "      const target = " + JSON.stringify(sourceSchema + '.' + sourceTable) + ";",
    "      if (typeof sql !== 'string') throw new Error('UNEXPECTED_GENERATED_SQL_TARGET');",
    "      const index = sql.indexOf(target);",
    "      const end = index + target.length;",
    "      if (index < 0 || sql.indexOf(target, end) !== -1 ||",
    "          (index > 0 && /[a-zA-Z0-9_]/.test(sql[index - 1])) ||",
    "          (end < sql.length && /[a-zA-Z0-9_]/.test(sql[end]))) {",
    "        throw new Error('UNEXPECTED_GENERATED_SQL_TARGET');",
    "      }",
    "      const rewritten = sql.slice(0, index) + quoted + '.records' + sql.slice(end);",
    "      return client.query(rewritten, values);",
    "    } };",
    "    repository.configure(proxy, { tenantColumn: 'organization_id' });",
    "    const tenantA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';",
    "    const tenantB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';",
    "    const requestedId = '11111111-1111-4111-8111-111111111111';",
    "    const created = await repository.create({ id: requestedId, name: 'owned by A', organization_id: tenantB }, { organizationId: tenantA });",
    "    expect(created).toBeTruthy();",
    "    const id = created.id;",
    "    expect(id).toBeTruthy();",
    "    expect(created.organization_id).toBe(tenantA);",
    "    expect((await repository.list({}, { organizationId: tenantB })).data).toHaveLength(0);",
    "    expect(await repository.getById(id, { organizationId: tenantB })).toBeNull();",
    "    expect(await repository.update(id, { name: 'tampered' }, { organizationId: tenantB })).toBeNull();",
    "    expect(await repository.remove(id, { organizationId: tenantB })).toBe(false);",
    "    expect((await repository.getById(id, { organizationId: tenantA })).name).toBe('owned by A');",
    "    await expect(repository.list({})).rejects.toMatchObject({ code: 'TENANT_SCOPE_REQUIRED' });",
    "  } finally {",
    "    try { if (schemaCreated) await client.query('DROP SCHEMA ' + quoted + ' CASCADE'); } finally { await client.end(); }",
    "  }",
    "}, 30000);"
  ].join('\n') + '\n';
  await fs.writeFile(path.resolve(root, relative), source, { flag: 'wx' });
  return {
    kind: 'artifact-postgresql-integration-suite', installable: false, integrationVerified: false,
    suitePaths: { postgresqlTenantIsolation: relative },
    artifacts: [...run.artifacts, { path: relative, bytes: Buffer.byteLength(source) }]
  };
}


async function prepareArtifactIntegrationSuites(run, definition) {
  const { root, folder } = await inspectArtifactIntegrationTargets(run);
  const fields = definition?.fields;
  if (!Array.isArray(fields) || fields.length !== 3 ||
      !['id', 'organization_id', 'name'].every(name => fields.some(field => field.name === name)) ||
      fields.find(field => field.name === 'id').dataType !== 'uuid' ||
      fields.find(field => field.name === 'organization_id').dataType !== 'uuid' ||
      fields.find(field => field.name === 'name').dataType !== 'text') {
    throw new Error('POSTGRESQL_SUITE_MODEL_UNSUPPORTED');
  }
  const names = ['jwt-crud.test.js', 'tenant-postgresql.test.js'];
  const paths = names.map(name => path.join(folder, name));
  for (const relative of paths) {
    try {
      await fs.lstat(path.resolve(root, relative));
      throw new Error('ARTIFACT_SUITE_ALREADY_EXISTS');
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  const created = [];
  try {
    const jwt = await prepareArtifactJwtIntegrationSuite(run);
    created.push(paths[0]);
    const pg = await prepareArtifactPostgresqlSuite(run, definition);
    created.push(paths[1]);
    return {
      kind: 'artifact-integration-suites-prepared',
      installable: false,
      integrationVerified: false,
      suitePaths: { ...pg.suitePaths, ...jwt.suitePaths },
      artifacts: [...run.artifacts, ...jwt.artifacts.slice(run.artifacts.length),
        ...pg.artifacts.slice(run.artifacts.length)]
    };
  } catch (error) {
    for (const relative of created) {
      await fs.rm(path.resolve(root, relative), { force: true });
    }
    throw error;
  }
}

module.exports = { inspectArtifactIntegrationTargets, prepareArtifactJwtIntegrationSuite, prepareArtifactPostgresqlSuite, prepareArtifactIntegrationSuites };
