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
    "const fastify = require('fastify');",
    "const jwt = require('@fastify/jwt');",
    "const fs = require('node:fs');",
    "const routes = require('./" + routeName + "');",
    "test('generated routes reject unauthenticated and unauthorized CRUD', async () => {",
    "  const app = fastify({ logger: false });",
    "  let queries = 0;",
    "  try {",
    "    await app.register(jwt, { secret: 'isolated-forge-artifact-test-secret' });",
    "    await app.register(routes, {",
    "      database: { async query() { queries++; return { rows: [], rowCount: 0 }; } },",
    "      tenantColumn: 'organization_id', requireTenantIsolation: true,",
    "      requireCrudPermissions: true, authorizeOperation: async () => false",
    "    });",
    "    await app.ready();",
    "    const source = fs.readFileSync(require.resolve('./" + routeName + "'), 'utf8');",
    "    const base = source.match(/const base\\s*=\\s*'([^']+)'/)?.[1];",
    "    expect(base).toBeTruthy();",
    "    const id = '11111111-1111-4111-8111-111111111111';",
    "    const ops = [",
    "      { method: 'GET', url: base },",
    "      { method: 'GET', url: base + '/' + id },",
    "      { method: 'POST', url: base, payload: { name: 'test' } },",
    "      { method: 'PATCH', url: base + '/' + id, payload: { name: 'test' } },",
    "      { method: 'DELETE', url: base + '/' + id }",
    "    ];",
    "    const token = app.jwt.sign({ id: 'user-a', organization_id: 'org-a' });",
    "    for (const op of ops) {",
    "      expect((await app.inject(op)).statusCode).toBe(401);",
    "      expect((await app.inject({ ...op, headers: { authorization: 'Bearer ' + token } })).statusCode).toBe(403);",
    "    }",
    "    expect(queries).toBe(0);",
    "  } finally { await app.close(); }",
    "});"
  ].join('\n') + '\n';
  await fs.writeFile(path.resolve(root, relative), source, { flag: 'wx' });
  return {
    kind: 'artifact-jwt-integration-suite',
    installable: false, integrationVerified: false,
    suitePaths: { jwtCrudIntegration: relative },
    artifacts: [...run.artifacts, { path: relative, bytes: Buffer.byteLength(source) }]
  };
}

module.exports = { inspectArtifactIntegrationTargets, prepareArtifactJwtIntegrationSuite };
