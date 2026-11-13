'use strict';
const { createPortalCrudSecurityBridge } = require('../studio/portal-crud-security-bridge');

const ORG = '123e4567-e89b-42d3-a456-426614174010';
const OTHER = '123e4567-e89b-42d3-a456-426614174011';
function database(sql, params) {
  if (sql.includes('public.organization_users')) {
    return { rows: params[0] === ORG && params[1] === '7'
      ? [{ organization_id: ORG, role: 'admin', status: 'active' }] : [] };
  }
  if (sql.includes('public.role_option_permissions')) {
    return { rows: params[0] === ORG && params[1] === 'admin' && params[2] === '50'
      ? [{ organization_id: ORG, role_code: 'admin', option_id: 50,
        allow: true, actions: { list: true, read: true, create: false, update: false, delete: false } }] : [] };
  }
  throw new Error('unexpected query');
}
function reply() {
  return { sent: false, statusCode: 200,
    code(value) { this.statusCode = value; return this; },
    send(value) { this.sent = true; this.body = value; return this; } };
}
function bridge(verifyJWT = async request => { request.user = { id: 7 }; }) {
  return createPortalCrudSecurityBridge({ verifyJWT, query: database, optionId: 50 });
}
test('read creates a server-derived tenant context', async () => {
  const request = { headers: { 'x-organization-id': ORG } };
  const response = reply();
  await bridge().preHandler('read')(request, response);
  expect(response.sent).toBe(false);
  expect(request.tenantContext).toEqual({ organizationId: ORG });
  expect(Object.isFrozen(request.tenantContext)).toBe(true);
});
test.each(['create', 'update', 'delete'])('%s is rejected without action grant', async operation => {
  const request = { headers: { 'x-organization-id': ORG } };
  const response = reply();
  await bridge().preHandler(operation)(request, response);
  expect(response.statusCode).toBe(403);
  expect(request.tenantContext).toBeUndefined();
});
test('foreign organization is rejected even with client-supplied context', async () => {
  const request = { headers: { 'x-organization-id': OTHER },
    tenantContext: { organizationId: OTHER },
    portalSecurityContext: { organizationId: OTHER } };
  const response = reply();
  await bridge().preHandler('list')(request, response);
  expect(response.statusCode).toBe(403);
  expect(request.tenantContext).toBeUndefined();
});
test('missing JWT identity is rejected and tenant scope is absent', async () => {
  const request = { headers: { 'x-organization-id': ORG } };
  const response = reply();
  await bridge(async () => {}).preHandler('read')(request, response);
  expect(response.statusCode).toBe(401);
  expect(request.tenantContext).toBeUndefined();
});
test('bridge cannot certify SQL tenant isolation or publication', () => {
  const value = bridge();
  expect(value.installable).toBe(false);
  expect(value.publicationAuthorized).toBe(false);
  expect(value.tenantSqlCertified).toBe(false);
});
