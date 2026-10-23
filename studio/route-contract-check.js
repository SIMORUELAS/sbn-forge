'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');

function normalizeRoute(value) {
  if (typeof value !== 'string' || !value.startsWith('/')) { return null; }
  return ('/' + value.replace(/^\/+|\/+$/g, '')).replace(/\/+/g, '/').replace(/\/:([A-Za-z_][\w]*)/g, '/:param');
}

function extractRoutes(source, file) {
  const routes = [];
  const pattern = /\b(?:fastify|app|server)\.(get|post|put|patch|delete)\s*\(\s*(['"])(\/[^'"\r\n]*)\2/g;
  for (const match of source.matchAll(pattern)) {
    routes.push({ method: match[1].toUpperCase(), path: normalizeRoute(match[3]), file });
  }
  return routes;
}

async function checkRouteContracts(directory, artifacts, hostEvidence) {
  const routeFiles = artifacts.filter(item => typeof item.path === 'string' && item.path.endsWith('.routes.js'));
  const generated = [];
  let unreadable = false;
  for (const item of routeFiles) {
    const resolved = path.resolve(directory, item.path);
    if (!resolved.startsWith(path.resolve(directory) + path.sep)) { unreadable = true; continue; }
    try {
      const stat = await fs.lstat(resolved);
      if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 128 * 1024) { unreadable = true; continue; }
      generated.push(...extractRoutes(await fs.readFile(resolved, 'utf8'), item.path));
    } catch { unreadable = true; }
  }
  const existing = hostEvidence.routeDeclarations || [];
  const matches = generated.flatMap(route => existing.filter(other => route.method === other.method && route.path === normalizeRoute(other.path)).map(other => ({ route, other })));
  if (matches.length) {
    return { check: 'route-contract-collisions', status: 'blocked', message: 'Coincidencias literales potencialmente conflictivas: ' + matches.slice(0, 6).map(({ route, other }) => route.method + ' ' + route.path + ' (' + route.file + ' / ' + other.file + ')').join('; ') + '. Revisar prefijos y registro efectivo antes de instalar' };
  }
  return { check: 'route-contract-collisions', status: 'unknown', message: 'Rutas generadas extraídas: ' + generated.length + '; rutas host extraídas: ' + existing.length + '. ' + (unreadable ? 'Artefactos no legibles. ' : '') + (hostEvidence.truncated ? 'Cobertura host parcial. ' : '') + 'Sin coincidencias literales demostradas; prefijos, rutas dinámicas y registro efectivo no certificados' };
}
module.exports = { checkRouteContracts, extractRoutes, normalizeRoute };
