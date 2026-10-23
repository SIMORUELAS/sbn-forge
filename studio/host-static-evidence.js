'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const MAX_FILES = 1200;
const MAX_ROUTES = 5000;
const MAX_BYTES = 128 * 1024;
const SKIP = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', '.next', '.env', 'secrets', 'certificates']);
const ALLOWED = /\.(?:js|cjs|mjs|ts)$/i;
const BACKUP = /(?:^|[\s._-])(?:copia|copy|backup|bak|resp|respaldo)(?:[\s._-]|\d|$)/i;
async function collectSourceEvidence(root) {
  const evidence = { scanned: 0, truncated: false, routeLimitReached: false, routes: [], authentication: [], authorization: [], organization: [], migrations: [], routeDeclarations: [] };
  const queue = [{ dir: root, depth: 0 }];
  while (queue.length && evidence.scanned < MAX_FILES) {
    const { dir, depth } = queue.shift();
    let entries;
    try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { continue; }
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      if (evidence.scanned >= MAX_FILES) { evidence.truncated = true; break; }
      if (entry.isSymbolicLink() || entry.name.startsWith('.') || SKIP.has(entry.name) || BACKUP.test(entry.name)) { continue; }
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (depth < 5) { queue.push({ dir: full, depth: depth + 1 }); }
        else { evidence.truncated = true; }
        continue;
      }
      if (!entry.isFile() || !ALLOWED.test(entry.name)) { continue; }
      const stat = await fs.lstat(full).catch(() => null);
      if (!stat || !stat.isFile() || stat.size > MAX_BYTES) { continue; }
      const relative = path.relative(root, full).replace(/\\/g, '/');
      const source = await fs.readFile(full, 'utf8');
      evidence.scanned++;
      const routePattern = /\b(?:fastify|app|server)\.(get|post|put|patch|delete)\s*\(\s*(['"])(\/[^'"\r\n]*)\2/g;
      for (const match of source.matchAll(routePattern)) {
        if (evidence.routeDeclarations.length >= MAX_ROUTES) { evidence.truncated = true; evidence.routeLimitReached = true; break; }
        evidence.routeDeclarations.push({ method: match[1].toUpperCase(), path: match[3], file: relative });
      }
      const patterns = {
        routes: /\b(?:fastify|app|server)\.(?:get|post|put|patch|delete|route|register)\s*\(/,
        authentication: /\b(?:authenticate|authentication|jwtVerify|verifyJwt|requireAuth)\b/i,
        authorization: /\b(?:authorize|authorization|permission|requireRole|hasRole)\b/i,
        organization: /\b(?:organization_id|organizationId|tenant_id|tenantId)\b/,
        migrations: /\b(?:CREATE TABLE|ALTER TABLE|migration|knex\.schema)\b/i
      };
      for (const [key, pattern] of Object.entries(patterns)) {
        if (pattern.test(source) && evidence[key].length < 8) { evidence[key].push(relative); }
      }
    }
  }
  if (queue.length) { evidence.truncated = true; }
  return evidence;
}
module.exports = { collectSourceEvidence };
