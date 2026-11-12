'use strict';
const { createPortalSecurityAdapter } = require('../studio/portal-security-adapter');

function makeReply() {
  return {
    sent: false, statusCode: 200,
    code(status) { this.statusCode = status; return this; },
    send(payload) { this.sent = true; this.payload = payload; return this; }
  };
}
function adapter(overrides = {}) {
  return createPortalSecurityAdapter({
    verifyJWT: async request => { request.user = { id: 12 }; },
    resolveOrganization: async () => 45,
    authorizeOperation: async () => true,
    ...overrides
  });
}
test('requires all trusted host adapters', () => {
  expect(() => createPortalSecurityAdapter()).toThrow('PORTAL_SECURITY_ADAPTER_INCOMPLETE');
});
test('rejects unknown operations before handling a request', () => {
  expect(() => adapter().guard('publish')).toThrow('INVALID_CRUD_OPERATION');
});
test.each(['list', 'read', 'create', 'update', 'delete'])('authorizes %s only with trusted context', async operation => {
  const request = { headers: { 'x-organization-id': '999' } };
  const reply = makeReply();
  await adapter().guard(operation)(request, reply);
  expect(reply.sent).toBe(false);
  expect(request.portalSecurityContext).toEqual({ userId: 12, organizationId: 45, operation });
});
test('does not continue after host JWT denial', async () => {
  const request = {};
  const reply = makeReply();
  await adapter({
    verifyJWT: async (_request, response) => response.code(401).send({ code: 'JWT_INVALID' })
  }).guard('read')(request, reply);
  expect(reply.statusCode).toBe(401);
  expect(request.portalSecurityContext).toBeUndefined();
});
test('missing verified user is rejected', async () => {
  const request = {};
  const reply = makeReply();
  await adapter({ verifyJWT: async () => {} }).guard('read')(request, reply);
  expect(reply.statusCode).toBe(401);
});
test('missing organization fails closed', async () => {
  const request = {};
  const reply = makeReply();
  await adapter({ resolveOrganization: async () => null }).guard('read')(request, reply);
  expect(reply.statusCode).toBe(403);
});
test('permission denial fails closed', async () => {
  const request = {};
  const reply = makeReply();
  await adapter({ authorizeOperation: async () => false }).guard('delete')(request, reply);
  expect(reply.payload.code).toBe('PERMISSION_DENIED');
});
test('security adapter exceptions fail closed', async () => {
  const request = {};
  const reply = makeReply();
  await adapter({ resolveOrganization: async () => { throw new Error('private'); } })
    .guard('create')(request, reply);
  expect(reply.statusCode).toBe(403);
  expect(JSON.stringify(reply.payload)).not.toContain('private');
});
test('no operation grants installation or publication', () => {
  expect(adapter().installable).toBe(false);
  expect(adapter().publicationAuthorized).toBe(false);
});
