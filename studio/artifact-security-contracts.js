'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');

// Generates module-local source contract tests. These are NOT PostgreSQL/JWT integration evidence.
async function prepareArtifactSecurityContracts(run) {
  if (!run || run.mode !== 'isolated-local' || run.published !== false ||
      run.databaseModified !== false || !Array.isArray(run.artifacts)) {
    throw new Error('ISOLATED_GENERATION_REQUIRED');
  }
  const root = await fs.realpath(run.directory);
  const select = suffix => {
    const found = run.artifacts.filter(item => typeof item.path === 'string' && item.path.endsWith(suffix));
    if (found.length !== 1) throw new Error('GENERATED_ARTIFACT_REQUIRED: ' + suffix);
    return found[0].path;
  };
  const repository = select('.repository.js');
  const routes = select('.routes.js');
  for (const relative of [repository, routes]) {
    const full = path.resolve(root, relative);
    if (!full.startsWith(root + path.sep)) throw new Error('INVALID_GENERATED_ARTIFACT_PATH');
    const stat = await fs.lstat(full);
    if (!stat.isFile() || stat.isSymbolicLink() ||
        !(await fs.realpath(full)).startsWith(root + path.sep)) {
      throw new Error('INVALID_GENERATED_ARTIFACT');
    }
  }
  const folder = path.dirname(repository);
  if (path.dirname(routes) !== folder) throw new Error('ARTIFACT_MODULE_MISMATCH');
  const relative = path.join(folder, 'security-contracts.test.js');
  const target = path.resolve(root, relative);
  if (!target.startsWith(root + path.sep)) throw new Error('INVALID_GENERATED_TEST_PATH');
  const source = `'use strict';
const fs = require('node:fs');
const path = require('node:path');
const repository = fs.readFileSync(path.join(__dirname, ${JSON.stringify(path.basename(repository))}), 'utf8');
const routes = fs.readFileSync(path.join(__dirname, ${JSON.stringify(path.basename(routes))}), 'utf8');

test('generated repository contains tenant scope guards', () => {
  expect(repository).toContain('TENANT_SCOPE_REQUIRED');
  expect(repository).toContain('tenantPredicate(context');
  expect(repository).toContain('tenantColumn');
});

test('generated routes require JWT authentication', () => {
  expect(routes).toContain('request.jwtVerify()');
  expect(routes).toContain("fastify.addHook('onRequest', requireAuth)");
});
`;
  await fs.writeFile(target, source, { flag: 'wx' });
  return {
    kind: 'source-contract-only',
    installable: false,
    integrationVerified: false,
    path: relative,
    artifacts: [...run.artifacts, { path: relative, bytes: Buffer.byteLength(source) }]
  };
}

module.exports = { prepareArtifactSecurityContracts };
