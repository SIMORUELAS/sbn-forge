'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { PostgresDatasource } = require('../src/datasources/postgresql');
const { PostgreSqlInspector } = require('../src/inspectors/postgresql');
const { createDefinitionStore, MAX_BYTES } = require('./definition-store');

const HOST = '127.0.0.1';
const PORT = Number(process.env.FORGE_STUDIO_PORT || 4173);
const ROOT = path.resolve(__dirname, 'public');
const CONTENT_TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };

function json(res, status, value) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(JSON.stringify(value));
}

function createStudioServer(options = {}) {
  const createDatasource = options.createDatasource || (config => new PostgresDatasource(config));
  const definitions = options.definitionStore || createDefinitionStore(options.definitionsDirectory);
  return http.createServer(async (req, res) => {
    const isDefinitionApi = (req.url || '').split('?')[0].startsWith('/api/studio/definitions');
    if (req.method !== 'GET' && req.method !== 'HEAD' && !(isDefinitionApi && req.method === 'POST')) {
      res.writeHead(405, { Allow: 'GET, HEAD' });
      res.end();
      return;
    }
    let pathname;
    try { pathname = new URL(req.url, 'http://localhost').pathname; }
    catch { res.writeHead(400); res.end(); return; }
    if (pathname === '/api/studio/definitions' || pathname.startsWith('/api/studio/definitions/')) {
      if (req.method === 'HEAD') { res.writeHead(405, { Allow: 'GET, POST' }); res.end(); return; }
      if (req.method === 'POST') {
        if (pathname !== '/api/studio/definitions') { json(res, 405, { error: 'Método no permitido' }); return; }
        const origin = req.headers.origin;
        const host = req.headers.host;
        if (origin && (!host || origin !== 'http://' + host || !/^127\.0\.0\.1(?::[0-9]+)?$/.test(host))) {
          json(res, 403, { error: 'Origen no autorizado' }); return;
        }
        if (!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type'] || '')) {
          json(res, 415, { error: 'Se requiere application/json' }); return;
        }
        try {
          let raw = '';
          for await (const chunk of req) {
            raw += chunk.toString('utf8');
            if (Buffer.byteLength(raw) > MAX_BYTES) { json(res, 413, { error: 'Definición demasiado grande' }); return; }
          }
          const saved = await definitions.save(JSON.parse(raw));
          json(res, 200, { name: saved.name, saved: true });
        } catch (error) {
          json(res, error instanceof SyntaxError || /inválid|obligatorio|protegido|ausente|grande|versión|clave/i.test(error.message) ? 400 : 500,
            { error: error instanceof SyntaxError ? 'JSON inválido' : error.message });
        }
        return;
      }
      if (req.method !== 'GET') { json(res, 405, { error: 'Método no permitido' }); return; }
      try {
        if (pathname === '/api/studio/definitions') { json(res, 200, { definitions: await definitions.list() }); return; }
        const name = decodeURIComponent(pathname.slice('/api/studio/definitions/'.length));
        if (name.includes('/')) { json(res, 400, { error: 'Nombre inválido' }); return; }
        json(res, 200, await definitions.get(name));
      } catch (error) {
        json(res, error.code === 'ENOENT' ? 404 : /inválid/i.test(error.message) ? 400 : 500, { error: error.code === 'ENOENT' ? 'Definición no encontrada' : 'No fue posible leer la definición' });
      }
      return;
    }
    // Explicit opt-in: database access is disabled unless configured locally.
    if (pathname === '/api/studio/inspect') {
      if (req.method !== 'GET') { json(res, 405, { error: 'Method not allowed' }); return; }
      if (process.env.FORGE_STUDIO_DB_INSPECT !== '1') { json(res, 503, { error: 'Inspector no configurado' }); return; }
      const url = new URL(req.url, 'http://localhost');
      const schema = url.searchParams.get('schema');
      const table = url.searchParams.get('table');
      if (!schema || !table || !/^[a-zA-Z_][a-zA-Z0-9_$]*$/.test(schema) || !/^[a-zA-Z_][a-zA-Z0-9_$]*$/.test(table)) {
        json(res, 400, { error: 'Schema o tabla inválidos' }); return;
      }
      const config = {
        host: process.env.FORGE_STUDIO_DB_HOST || '127.0.0.1',
        port: Number(process.env.FORGE_STUDIO_DB_PORT || 5432),
        database: process.env.FORGE_STUDIO_DB_NAME,
        user: process.env.FORGE_STUDIO_DB_USER,
        password: process.env.FORGE_STUDIO_DB_PASSWORD,
        connectionTimeoutMillis: 3000,
        query_timeout: 10000,
        statement_timeout: 10000,
        options: '-c default_transaction_read_only=on'
      };
      if (!config.database || !config.user || !config.password) {
        json(res, 503, { error: 'Configuración PostgreSQL incompleta' }); return;
      }
      let datasource;
      try {
        datasource = createDatasource(config);
        const metadata = await new PostgreSqlInspector(datasource).inspect({ schema, table });
        json(res, 200, metadata);
      } catch (error) {
        json(res, error.code === 'POSTGRESQL_TABLE_NOT_FOUND' ? 404 : 502, { error: 'No fue posible inspeccionar la tabla' });
      } finally {
        if (datasource) { await datasource.close(); }
      }
      return;
    }
    if (pathname === '/api/studio/tables') {
      if (req.method !== 'GET') { json(res, 405, { error: 'Method not allowed' }); return; }
      if (process.env.FORGE_STUDIO_DB_INSPECT !== '1') { json(res, 503, { error: 'Inspector no configurado' }); return; }
      const schema = new URL(req.url, 'http://localhost').searchParams.get('schema');
      if (!schema || !/^[a-zA-Z_][a-zA-Z0-9_$]*$/.test(schema)) {
        json(res, 400, { error: 'Esquema inválido' }); return;
      }
      const config = {
        host: process.env.FORGE_STUDIO_DB_HOST || '127.0.0.1',
        port: Number(process.env.FORGE_STUDIO_DB_PORT || 5432),
        database: process.env.FORGE_STUDIO_DB_NAME,
        user: process.env.FORGE_STUDIO_DB_USER,
        password: process.env.FORGE_STUDIO_DB_PASSWORD,
        connectionTimeoutMillis: 3000,
        query_timeout: 10000,
        statement_timeout: 10000,
        options: '-c default_transaction_read_only=on'
      };
      if (!config.database || !config.user || !config.password) {
        json(res, 503, { error: 'Configuración PostgreSQL incompleta' }); return;
      }
      let datasource;
      try {
        datasource = createDatasource(config);
        const result = await datasource.query(`
          SELECT table_name AS name
          FROM information_schema.tables
          WHERE table_schema = $1 AND table_type = 'BASE TABLE'
          ORDER BY table_name
        `, [schema]);
        json(res, 200, { schema, tables: result.rows.map(row => row.name) });
      } catch {
        json(res, 502, { error: 'No fue posible consultar las tablas' });
      } finally {
        if (datasource) { await datasource.close(); }
      }
      return;
    }
    const routes = { '/': 'index.html', '/index.html': 'index.html', '/app.css': 'app.css', '/app.js': 'app.js', '/product-hub': 'product-hub.html', '/product-hub.html': 'product-hub.html', '/product-hub.js': 'product-hub.js', '/product-hub.css': 'product-hub.css' };
    const filename = routes[pathname];
    if (!filename) { res.writeHead(404); res.end(); return; }
    const file = path.join(ROOT, filename);
    fs.readFile(file, (err, content) => {
      if (err) { res.writeHead(500); res.end(); return; }
      res.writeHead(200, {
        'Content-Type': CONTENT_TYPES[path.extname(file)],
        'Cache-Control': 'no-store',
        'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'no-referrer'
      });
      if (req.method === 'HEAD') { res.end(); } else { res.end(content); }
    });
  });
}

if (require.main === module) {
  if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) { throw new Error('FORGE_STUDIO_PORT inválido'); }
  createStudioServer().listen(PORT, HOST, () => {
    process.stdout.write('SBN Forge Studio (prototipo local): http://' + HOST + ':' + PORT + '\n');
  });
}
module.exports = { createStudioServer };
