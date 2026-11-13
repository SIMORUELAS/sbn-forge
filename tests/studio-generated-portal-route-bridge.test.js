'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Handlebars = require('handlebars');
const source = fs.readFileSync(path.join(__dirname, '../src/templates/backend/routes.hbs'), 'utf8');

function generated(requireJwt = true) {
  const compiled = Handlebars.compile(source)({
    names: { moduleName: 'records', variablePlural: 'records', routeBase: '/records' },
    primaryKeyInfo: { isComposite: false }, security: { requireJwt }
  });
  const module = { exports: {} };
  const routes = [];
  const repository = { configure: jest.fn() };
  const fastify = { pg: { query: async () => ({ rows: [] }) },
    addHook: jest.fn(),
    get: (url, opts) => routes.push({ method: 'GET', url, ...opts }),
    post: (url, opts) => routes.push({ method: 'POST', url, ...opts }),
    patch: (url, opts) => routes.push({ method: 'PATCH', url, ...opts }),
    delete: (url, opts) => routes.push({ method: 'DELETE', url, ...opts }) };
  vm.runInNewContext(compiled, { module, exports: module.exports,
    require: name => name.endsWith('.repository') ? repository : {} });
  return { register: module.exports, fastify, routes, repository };
}
const bridge = () => ({
  preHandler: jest.fn(operation => async request => { request.operation = operation; }),
  installable: false, publicationAuthorized: false
});
const options = b => ({ portalSecurityBridge: b, tenantColumn: 'organization_id',
  requireTenantIsolation: true, requireCrudPermissions: true });
test('Portal opt-in attaches five distinct CRUD guards', async () => {
  const generatedRoutes = generated();
  const b = bridge();
  await generatedRoutes.register(generatedRoutes.fastify, options(b));
  expect(b.preHandler.mock.calls.map(args => args[0])).toEqual([
    'list', 'read', 'create', 'update', 'delete'
  ]);
  expect(generatedRoutes.routes).toHaveLength(5);
  for (let i = 0; i < 5; i++) {
    const request = {};
    await generatedRoutes.routes[i].preHandler(request, {});
    expect(request.operation).toBe(['list', 'read', 'create', 'update', 'delete'][i]);
  }
  expect(generatedRoutes.repository.configure).toHaveBeenCalledWith(
    generatedRoutes.fastify.pg, { tenantColumn: 'organization_id' }
  );
});
test.each([
  { tenantColumn: null, requireTenantIsolation: true, requireCrudPermissions: true },
  { tenantColumn: 'organization_id', requireTenantIsolation: false, requireCrudPermissions: true },
  { tenantColumn: 'organization_id', requireTenantIsolation: true, requireCrudPermissions: false }
])('Portal bridge refuses incomplete tenant configuration %#', async bad => {
  const g = generated();
  await expect(g.register(g.fastify, { ...options(bridge()), ...bad })).rejects.toThrow();
  expect(g.routes).toHaveLength(0);
});
test('Portal bridge cannot bypass missing generated JWT requirement', async () => {
  const g = generated(false);
  await expect(g.register(g.fastify, options(bridge()))).rejects.toThrow();
  expect(g.routes).toHaveLength(0);
});
test('Portal bridge rejects non-guard callbacks', async () => {
  const g = generated();
  await expect(g.register(g.fastify, options({ ...bridge(), preHandler: () => null })))
    .rejects.toThrow('PORTAL_SECURITY_GUARD_INCOMPLETE');
  expect(g.routes).toHaveLength(0);
});
test('legacy routes still register without opt-in', async () => {
  const g = generated();
  await g.register(g.fastify, {});
  expect(g.routes).toHaveLength(5);
});
