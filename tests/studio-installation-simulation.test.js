'use strict';
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { simulateInstallation } = require('../studio/installation-simulation');

test('dry-run records missing host evidence without installing or changing database', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'studio-install-dryrun-'));
  try {
    const artifacts = [];
    for (const name of ['demo.routes.js', 'demo.repository.js', 'demo.schema.js']) {
      await fs.writeFile(path.join(directory, name), 'module.exports = {};');
      artifacts.push({ path: name });
    }
    const manifestPath = 'sbn-forge.manifest.json';
    await fs.writeFile(path.join(directory, manifestPath), JSON.stringify({ files: artifacts.map(a => ({ relativePath: a.path })) }));
    artifacts.push({ path: manifestPath });
    const report = await simulateInstallation(directory, artifacts);
    expect(report.mode).toBe('dry-run');
    expect(report.status).toBe('review-required');
    expect(report.installable).toBe(false);
    expect(report.published).toBe(false);
    expect(report.databaseModified).toBe(false);
    expect(report.checks.filter(c => c.status === 'unknown')).toHaveLength(10);
    expect(report.checks).toContainEqual(expect.objectContaining({
      check: 'security-integration-readiness',
      status: 'unknown'
    }));
    for (const check of ['generated-authentication-contract', 'generated-authorization-contract', 'generated-organization-contract']) {
      expect(report.checks).toContainEqual(expect.objectContaining({ check, status: 'unknown' }));
    }
    const blocked = await simulateInstallation(directory, []);
    expect(blocked.status).toBe('blocked');
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});
