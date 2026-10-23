'use strict';
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { checkRouteContracts, extractRoutes } = require('../studio/route-contract-check');

test('extracts literal method and path while normalizing parameter names', () => {
  expect(extractRoutes("fastify.get('/api/projects/:projectId', handler);", 'routes.js'))
    .toEqual([{ method: 'GET', path: '/api/projects/:param', file: 'routes.js' }]);
});

test('blocks potential exact route collision without installing anything', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-contract-'));
  try {
    await fs.writeFile(path.join(directory, 'demo.routes.js'), "fastify.post('/api/projects/:id', handler);");
    const result = await checkRouteContracts(directory, [{ path: 'demo.routes.js' }], {
      routeDeclarations: [{ method: 'POST', path: '/api/projects/:projectId', file: 'src/projects.routes.js' }],
      truncated: false
    });
    expect(result.status).toBe('blocked');
    expect(result.message).toContain('src/projects.routes.js');
    const noMatch = await checkRouteContracts(directory, [{ path: 'demo.routes.js' }], {
      routeDeclarations: [{ method: 'GET', path: '/api/projects/:id', file: 'src/projects.routes.js' }],
      truncated: true
    });
    expect(noMatch.status).toBe('unknown');
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test('extracts all five generated routes using static base and template paths', () => {
  const source = "const base = '/product-development-projects';\nfastify.get(base, {}, controller.list);\nfastify.get(`${base}/:id`, {}, controller.getById);\nfastify.post(base, {}, controller.create);\nfastify.patch(`${base}/:id`, {}, controller.update);\nfastify.delete(`${base}/:id`, {}, controller.remove);";
  const routes = extractRoutes(source, 'generated.routes.js');
  expect(routes).toHaveLength(5);
  expect(routes.map(route => route.method + ' ' + route.path)).toEqual(["GET /product-development-projects","GET /product-development-projects/:param","POST /product-development-projects","PATCH /product-development-projects/:param","DELETE /product-development-projects/:param"]);
});
