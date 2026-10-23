'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const { inspectHost } = require('./host-inspector');
async function simulateInstallation(directory, artifacts, options = {}) {
  const names = artifacts.map(a => a.path);
  const checks = [];
  for (const [check, suffix] of [['fastify-routes','.routes.js'],['postgresql-repository','.repository.js'],['schema-contract','.schema.js'],['manifest-contract','/sbn-forge.manifest.json']]) {
    const name = names.find(p => p.endsWith(suffix));
    let valid = Boolean(name);
    if (name && check === 'manifest-contract') {
      try { const manifest = JSON.parse(await fs.readFile(path.join(directory, name), 'utf8')); valid = Array.isArray(manifest.files); } catch { valid = false; }
    }
    checks.push({ check, status: valid ? 'passed' : 'blocked', message: valid ? 'Artefacto presente; compatibilidad con host no certificada' : 'Artefacto requerido ausente o inválido' });
  }
  for (const check of ['host-dependencies','authentication','authorization','organization-scope','route-conflicts','database-migrations']) {
    checks.push({ check, status: 'unknown', message: 'Requiere inspección de la aplicación host; no verificado' });
  }
  const host = await inspectHost(options.hostRoot);
  if (host.configured) {
    for (const evidence of host.checks) {
      const index = checks.findIndex(item => item.check === evidence.check);
      if (index >= 0) checks[index] = evidence;
      else checks.push(evidence);
    }
  }
  return { mode: 'dry-run', hostConfigured: host.configured, status: checks.some(c => c.status === 'blocked') ? 'blocked' : 'review-required', installable: false, published: false, databaseModified: false, checks };
}
module.exports = { simulateInstallation };
