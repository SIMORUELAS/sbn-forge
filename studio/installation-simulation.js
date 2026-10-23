'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const { inspectHost } = require('./host-inspector');
const { checkRouteContracts } = require('./route-contract-check');
const { inspectGeneratedSecurity } = require('./generated-security-inspector');
async function simulateInstallation(directory, artifacts, options = {}) {
  const names = artifacts.map(a => a.path);
  const checks = [];
  for (const [check, suffix] of [['fastify-routes','.routes.js'],['postgresql-repository','.repository.js'],['schema-contract','.schema.js'],['manifest-contract','/sbn-forge.manifest.json']]) {
    const name = names.find(p => p.endsWith(suffix) || (check === 'manifest-contract' && p === 'sbn-forge.manifest.json'));
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
      if (index >= 0) { checks[index] = evidence; }
      else { checks.push(evidence); }
    }
  }
  if (host.configured && host.routeEvidence) {
    checks.push(await checkRouteContracts(directory, artifacts, host.routeEvidence));
  }
  checks.push(...await inspectGeneratedSecurity(directory, artifacts));
  checks.push({ check: 'security-integration-readiness', status: 'unknown', message: 'La presencia de referencias JWT, permisos y organización en el host no demuestra que las rutas generadas estén protegidas. Requiere verificar hooks efectivos, permisos por operación y aislamiento de datos antes de instalar' });
  return { mode: 'dry-run', hostConfigured: host.configured, status: checks.some(c => c.status === 'blocked') ? 'blocked' : 'review-required', installable: false, published: false, databaseModified: false, checks };
}
module.exports = { simulateInstallation };
