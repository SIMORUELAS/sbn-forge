'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const { collectSourceEvidence } = require('./host-static-evidence');

async function inspectHost(hostRoot) {
  const checks = [];
  if (!hostRoot) { return { configured: false, checks: [{ check: 'host-source', status: 'unknown', message: 'Ruta del host no configurada' }] }; }
  const root = path.resolve(hostRoot);
  const rootStat = await fs.lstat(root).catch(() => null);
  if (!rootStat || !rootStat.isDirectory() || rootStat.isSymbolicLink()) {
    return { configured: true, checks: [{ check: 'host-source', status: 'blocked', message: 'Directorio host inexistente o no permitido' }] };
  }
  const packageFile = path.join(root, 'package.json');
  const stat = await fs.lstat(packageFile).catch(() => null);
  if (!stat || !stat.isFile() || stat.isSymbolicLink() || stat.size > 256 * 1024) {
    checks.push({ check: 'host-dependencies', status: 'unknown', message: 'No existe package.json legible en la raíz del host' });
  } else {
    try {
      const pkg = JSON.parse(await fs.readFile(packageFile, 'utf8'));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      const fastify = deps.fastify || null;
      const pg = deps.pg || null;
      checks.push({ check: 'host-dependencies', status: 'unknown',
        message: 'Dependencias declaradas: fastify=' + (fastify || 'no declarado') + ', pg=' + (pg || 'no declarado') + '. Compatibilidad y versiones instaladas no certificadas' });
    } catch {
      checks.push({ check: 'host-dependencies', status: 'blocked', message: 'package.json no válido' });
    }
  }
  const evidence = await collectSourceEvidence(root);
  const descriptions = {
    authentication: ['authentication', 'Referencias de autenticación'],
    authorization: ['authorization', 'Referencias de autorización'],
    'organization-scope': ['organization', 'Referencias de organización'],
    'route-conflicts': ['routes', 'Archivos con registros de rutas (colisiones no certificadas)'],
    'database-migrations': ['migrations', 'Referencias de migraciones']
  };
  for (const [check, [category, label]] of Object.entries(descriptions)) {
    const files = evidence[category];
    checks.push({ check, status: 'unknown',
      message: label + ': ' + (files.length ? files.join(', ') : 'sin coincidencias') +
        '. Coincidencia textual, no prueba de cumplimiento. Archivos examinados: ' + evidence.scanned +
        (evidence.truncated ? ' (inspección parcial)' : '') });
  }
  checks.push({ check: 'route-declarations', status: 'unknown', message: 'Rutas literales detectadas: ' + evidence.routeDeclarations.length + '. ' + evidence.routeDeclarations.slice(0, 8).map(item => item.method + ' ' + item.path + ' (' + item.file + ')').join('; ') + '. Prefijos dinámicos y colisiones no certificados' });
  return { configured: true, checks };
}
module.exports = { inspectHost };
