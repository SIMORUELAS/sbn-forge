'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const MAX_BYTES = 128 * 1024;
const { extractRoutes } = require('./route-contract-check');
const categories = [
  { check: 'generated-authentication-contract', kind: 'routes', pattern: /\b(?:jwtVerify|authenticate|requireAuth|verifyJwt|preHandler|onRequest)\b/i },
  { check: 'generated-authorization-contract', kind: 'routes', pattern: /\b(?:authorize|requireRole|permission|hasRole|requirePermission)\b/i },
  { check: 'generated-organization-contract', kind: 'repository', pattern: /\b(?:organization_id|organizationId|tenant_id|tenantId)\b/i }
];
async function inspectGeneratedSecurity(directory, artifacts) {
  const checks = [];
  const root = path.resolve(directory);
  const exposed = [];
  const routeSources = [];
  let routeEvidenceIncomplete = false;
  for (const item of artifacts.filter(entry => typeof entry.path === 'string' && entry.path.endsWith('.routes.js'))) {
    const full = path.resolve(root, item.path);
    if (!full.startsWith(root + path.sep)) { routeEvidenceIncomplete = true; continue; }
    try {
      const stat = await fs.lstat(full);
      if (!stat.isFile() || stat.isSymbolicLink() || stat.size > MAX_BYTES) { routeEvidenceIncomplete = true; continue; }
      const source = await fs.readFile(full, 'utf8');
      routeSources.push(source);
      exposed.push(...extractRoutes(source, item.path));
    } catch { routeEvidenceIncomplete = true; }
  }
  const hostAuthPattern = /require\s*\(\s*['"][^'"]*middlewares\/auth['"]\s*\)/;
  const preHandlerPattern = /preHandler\s*:\s*verifyJWT/;
  const usesHostAuth = routeSources.some(source => hostAuthPattern.test(source) && preHandlerPattern.test(source));
  checks.push({ check: 'generated-host-jwt-contract', status: 'unknown',
    message: usesHostAuth ? 'Referencias al middleware verifyJWT detectadas; falta certificar cobertura de cada operación y resolución de imports' :
      'No se identificó integración explícita con el middleware verifyJWT de SBN Portal; requiere adaptación antes de instalar' });
  checks.push({ check: 'generated-route-security-exposure', status: 'unknown',
    message: 'Operaciones HTTP detectadas: ' + exposed.length + '. ' + exposed.slice(0, 12).map(route => route.method + ' ' + route.path).join('; ') +
      (routeEvidenceIncomplete ? '. Archivos no legibles' : '') + '. No se ha demostrado protección efectiva por operación ni por organización' });
  for (const category of categories) {
    const files = artifacts.filter(item => typeof item.path === 'string' && item.path.endsWith('.' + category.kind + '.js'));
    const found = [];
    let unreadable = false;
    for (const item of files) {
      const full = path.resolve(root, item.path);
      if (!full.startsWith(root + path.sep)) { unreadable = true; continue; }
      try {
        const stat = await fs.lstat(full);
        if (!stat.isFile() || stat.isSymbolicLink() || stat.size > MAX_BYTES) { unreadable = true; continue; }
        const content = await fs.readFile(full, 'utf8');
        if (category.pattern.test(content)) { found.push(item.path); }
      } catch { unreadable = true; }
    }
    checks.push({ check: category.check, status: 'unknown',
      message: 'Referencias textuales identificadas: ' + found.length + '/' + files.length +
        (found.length ? ' (' + found.slice(0, 5).join(', ') + ')' : '') +
        (unreadable || files.length === 0 ? '. Evidencia incompleta' : '') +
        '. La coincidencia no certifica hooks efectivos, permisos ni aislamiento entre organizaciones' });
  }
  // A textual organization reference is not evidence that SQL is tenant-scoped.
  // Keep the installation review-only until the generated repository is certified.
  const repositories = artifacts.filter(item => typeof item.path === 'string' && item.path.endsWith('.repository.js'));
  checks.push({
    check: 'generated-tenant-query-isolation',
    status: 'unknown',
    message: 'Repositorios generados examinables: ' + repositories.length +
      '. No existe evidencia ejecutable de predicados organizacionales obligatorios en SELECT, INSERT, UPDATE y DELETE. ' +
      'Un organizationId en el contexto o una coincidencia textual no certifica aislamiento multiempresa; instalación deshabilitada.'
  });
  return checks;
}
module.exports = { inspectGeneratedSecurity };
