'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');

async function inspectHost(hostRoot) {
  const checks = [];
  if (!hostRoot) return { configured: false, checks: [{ check: 'host-source', status: 'unknown', message: 'Ruta del host no configurada' }] };
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
  for (const check of ['authentication', 'authorization', 'organization-scope', 'route-conflicts', 'database-migrations']) {
    checks.push({ check, status: 'unknown', message: 'La inspección estática limitada no demuestra este requisito' });
  }
  return { configured: true, checks };
}
module.exports = { inspectHost };
