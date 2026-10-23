'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const MAX_BYTES = 128 * 1024;
const categories = [
  { check: 'generated-authentication-contract', kind: 'routes', pattern: /\b(?:jwtVerify|authenticate|requireAuth|verifyJwt|preHandler|onRequest)\b/i },
  { check: 'generated-authorization-contract', kind: 'routes', pattern: /\b(?:authorize|requireRole|permission|hasRole|requirePermission)\b/i },
  { check: 'generated-organization-contract', kind: 'repository', pattern: /\b(?:organization_id|organizationId|tenant_id|tenantId)\b/i }
];
async function inspectGeneratedSecurity(directory, artifacts) {
  const checks = [];
  const root = path.resolve(directory);
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
  return checks;
}
module.exports = { inspectGeneratedSecurity };
