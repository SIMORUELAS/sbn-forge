'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const HOST = '127.0.0.1';
const PORT = Number(process.env.FORGE_STUDIO_PORT || 4173);
const ROOT = path.resolve(__dirname, 'public');
const CONTENT_TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };

function createStudioServer() {
  return http.createServer((req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { Allow: 'GET, HEAD' });
      res.end();
      return;
    }
    let pathname;
    try { pathname = new URL(req.url, 'http://localhost').pathname; }
    catch { res.writeHead(400); res.end(); return; }
    const routes = { '/': 'index.html', '/index.html': 'index.html', '/app.css': 'app.css', '/app.js': 'app.js' };
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
