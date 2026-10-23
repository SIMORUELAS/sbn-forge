'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');

function normalizeRoute(value) {
  if (typeof value !== 'string' || !value.startsWith('/')) { return null; }
  return ('/' + value.replace(/^\/+|\/+$/g, '')).replace(/\/+/g, '/').replace(/\/:([A-Za-z_][\w]*)/g, '/:param');
}

function extractRoutes(source, file) {
  const routes = [];
  // Static extraction only: never evaluate generated source.
  const constants = new Map();
  const declaration = /\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*(['"])(\/[^'"\r\n]*)\2\s*;/g;
  for (const match of source.matchAll(declaration)) { constants.set(match[1], match[3]); }
  const pattern = /\b(?:fastify|app|server)\.(get|post|put|patch|delete)\s*\(\s*(?:(['"])(\/[^'"\r\n]*)\2|([A-Za-z_$][\w$]*)|`\$\{([A-Za-z_$][\w$]*)\}([^`\r\n]*)`)/g;
  for (const match of source.matchAll(pattern)) {
    const raw = match[3] || (match[4] && constants.get(match[4])) ||
      (match[5] && constants.get(match[5]) && constants.get(match[5]) + match[6]);
    const route = normalizeRoute(raw);
    if (route) { routes.push({ method: match[1].toUpperCase(), path: route, file }); }
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
  const routeCount = generated.length;
  const matches = generated.flatMap(route => existing.filter(other => route.method === other.method && route.path === normalizeRoute(other.path)).map(other => ({ route, other })));
  if (matches.length) {
    return { check: 'route-contract-collisions', status: 'blocked', message: 'Coincidencias literales potencialmente conflictivas: ' + matches.slice(0, 6).map(({ route, other }) => route.method + ' ' + route.path + ' (' + route.file + ' / ' + other.file + ')').join('; ') + '. Revisar prefijos y registro efectivo antes de instalar' };
  }
  return { check: 'route-contract-collisions', status: 'unknown', message: 'Rutas generadas extraídas: ' + routeCount + '; rutas host extraídas: ' + existing.length + '. ' + (unreadable ? 'Artefactos no legibles. ' : '') + (hostEvidence.truncated ? 'Cobertura host parcial. ' : '') + 'Sin coincidencias literales demostradas; prefijos, rutas dinámicas y registro efectivo no certificados' };
}
module.exports = { checkRouteContracts, extractRoutes, normalizeRoute };
