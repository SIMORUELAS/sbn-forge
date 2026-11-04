'use strict';
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { inspectArtifactSecurity } = require('../studio/artifact-security-inspector');
const { REQUIRED } = require('../studio/security-certification');

let root;
beforeEach(async () => { root = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-inspect-')); });
afterEach(async () => { await fs.rm(root, { recursive: true, force: true }); });

test('inspects artifact markers but never promotes observations to certification', async () => {
  await fs.writeFile(path.join(root, 'demo.routes.js'),
    'jwtVerify authorizeOperation requireCrudPermissions organizationId get post patch delete');
  await fs.writeFile(path.join(root, 'demo.repository.js'), 'organization_id');
  await fs.writeFile(path.join(root, 'jwt-crud.test.js'), 'test("demo",()=>{})');
  await fs.writeFile(path.join(root, 'tenant-postgresql.test.js'), 'test("demo",()=>{})');
  const artifacts = ['demo.routes.js', 'demo.repository.js', 'jwt-crud.test.js',
    'tenant-postgresql.test.js'].map(file => ({ path: file }));
  const result = await inspectArtifactSecurity({ artifactRoot: root, artifacts });
  expect(result).toMatchObject({ authoritative: false, installable: false, verifiedChecks: [] });
  expect(result.observations).toHaveLength(REQUIRED.length);
  expect(result.observations.every(item => item.status === 'observed')).toBe(true);
  expect(result.observations.some(item => item.status === 'passed')).toBe(false);
});

test('missing security markers remain missing, not passed', async () => {
  await fs.writeFile(path.join(root, 'demo.routes.js'), 'module.exports = {};');
  await fs.writeFile(path.join(root, 'demo.repository.js'), 'module.exports = {};');
  const result = await inspectArtifactSecurity({
    artifactRoot: root, artifacts: [{ path: 'demo.routes.js' }, { path: 'demo.repository.js' }]
  });
  expect(result.observations.every(item => item.status === 'missing')).toBe(true);
  expect(result.installable).toBe(false);
});

test('rejects path traversal, duplicate declarations and symlinks', async () => {
  await fs.writeFile(path.join(root, 'safe.js'), 'ok');
  const inspect = artifacts => inspectArtifactSecurity({ artifactRoot: root, artifacts });
  await expect(inspect([{ path: '../outside.js' }])).rejects.toThrow('INVALID_INSPECTION_PATH');
  await expect(inspect([{ path: 'safe.js' }, { path: 'safe.js' }]))
    .rejects.toThrow('INVALID_INSPECTION_ARTIFACTS');
  const target = path.join(root, 'safe.js');
  try {
    await fs.symlink(target, path.join(root, 'linked.js'), 'file');
    await expect(inspect([{ path: 'linked.js' }])).rejects.toThrow('INVALID_INSPECTION_FILE');
  } catch (error) {
    if (error.code !== 'EPERM' && error.code !== 'EACCES' && error.code !== 'ENOTSUP') throw error;
  }
});
