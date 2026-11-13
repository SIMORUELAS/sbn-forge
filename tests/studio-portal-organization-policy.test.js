'use strict';
const { createPortalOrganizationPolicy } = require('../studio/portal-organization-policy');
const { createPortalSecurityAdapter } = require('../studio/portal-security-adapter');

function query(sql, params) {
  if (sql.includes('public.organization_users')) {
    const [org, user] = params;
    return { rows: org === '10' && user === '7' ?
      [{ organization_id: 10, role: 'MANAGER', status: 'active' }] : [] };
  }
  if (sql.includes('public.role_option_permissions')) {
    const [org, role, option] = params;
    return { rows: org === '10' && role === 'MANAGER' && option === '50' ?
      [{ organization_id: 10, role_code: 'MANAGER', option_id: 50,
        allow: true, actions: { list: true, read: true, create: false, update: false, delete: false } }] : [] };
  }
  throw new Error('unexpected query');
}
const makePolicy = (fn = query) => createPortalOrganizationPolicy({ query: fn, optionId: 50 });
const request = () => ({ headers: { 'x-organization-id': '10' }, user: { id: 7 } });

test('resolves active membership, not untrusted header alone', async () => {
  const policy = makePolicy();
  expect(await policy.resolveOrganization({ request: request(), userId: 7 })).toBe('10');
  expect(await policy.resolveOrganization({ request: { headers: { 'x-organization-id': '11' } }, userId: 7 })).toBeNull();
  expect(await policy.resolveOrganization({ request: { headers: { 'x-organization-id': '10' } }, userId: 8 })).toBeNull();
});
test('read allowed but writes denied by explicit action flags', async () => {
  const policy = makePolicy();
  expect(await policy.authorizeOperation({ userId: 7, organizationId: '10', operation: 'read' })).toBe(true);
  for (const operation of ['create', 'update', 'delete']) {
    expect(await policy.authorizeOperation({ userId: 7, organizationId: '10', operation })).toBe(false);
  }
});
test('invalid ids and missing organization fail closed without querying', async () => {
  const policy = makePolicy(() => { throw new Error('query must not run'); });
  expect(await policy.resolveOrganization({ request: { headers: { 'x-organization-id': '10 OR 1=1' } }, userId: 7 })).toBeNull();
  expect(await policy.authorizeOperation({ userId: 7, organizationId: '0', operation: 'read' })).toBe(false);
});
test('forged permission rows and malformed actions never grant access', async () => {
  const policy = makePolicy((sql, params) => sql.includes('organization_users') ?
    query(sql, params) : { rows: [{ organization_id: 11, role_code: 'MANAGER',
      option_id: 50, allow: true, actions: { read: true } }] });
  expect(await policy.authorizeOperation({ userId: 7, organizationId: '10', operation: 'read' })).toBe(false);
});
test('can be composed with the isolated JWT guard without granting publication', async () => {
  const policy = makePolicy();
  const adapter = createPortalSecurityAdapter({
    verifyJWT: async req => { req.user = { id: 7 }; },
    resolveOrganization: policy.resolveOrganization,
    authorizeOperation: policy.authorizeOperation
  });
  const reply = { sent: false, statusCode: 200,
    code(n) { this.statusCode = n; return this; },
    send(body) { this.sent = true; this.body = body; return this; } };
  const req = request();
  await adapter.guard('read')(req, reply);
  expect(req.portalSecurityContext.organizationId).toBe('10');
  expect(adapter.installable).toBe(false);
  expect(policy.installationAuthorized).toBe(false);
});
