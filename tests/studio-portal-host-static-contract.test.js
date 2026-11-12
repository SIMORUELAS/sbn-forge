'use strict';
const { inspectPortalHostContract } = require('../studio/portal-host-static-contract');

const appSource = [
  "await fastify.register(jwtPlugin);",
  "fastify.addHook('onRequest', async (request, reply) => {",
  "try { await request.jwtVerify(); request.userLog = { id: request.user.id }; }",
  "catch (err) { request.userLog = null; }",
  "});",
  "await fastify.register(registerForgeRoutes, { prefix: '/api' });"
].join('\n');
const authSource = "async function verifyJWT(request, reply) { try { await request.jwtVerify(); } catch (error) { return reply.code(401).send({}); } }";

test('recognizes Portal JWT middleware and Forge registry as static observations', () => {
  const result = inspectPortalHostContract({ appSource, authSource });
  expect(result.findings.find(item => item.id === 'jwt-middleware').status)
    .toBe('STATIC_REFERENCE_FOUND');
  expect(result.findings.find(item => item.id === 'forge-route-registry').status)
    .toBe('STATIC_REFERENCE_FOUND');
  expect(result.hostRouteRegistryObserved).toBe(true);
});
test('global audit JWT hook cannot certify effective route authentication', () => {
  const result = inspectPortalHostContract({ appSource, authSource });
  expect(result.findings.find(item => item.id === 'global-audit-hook-catches-jwt-error').status)
    .toBe('STATIC_REFERENCE_FOUND');
  expect(result.effectiveAuthenticationVerified).toBe(false);
  expect(result.installationAuthorized).toBe(false);
});
test('missing source stays unverified', () => {
  const result = inspectPortalHostContract({ appSource: '', authSource: '' });
  expect(result.findings.every(item => item.status === 'NOT_OBSERVED')).toBe(true);
  expect(result.effectiveAuthorizationVerified).toBe(false);
  expect(result.effectiveTenantIsolationVerified).toBe(false);
});
test('oversized or malformed inputs fail closed', () => {
  for (const value of [null, 'x'.repeat(512 * 1024 + 1)]) {
    const result = inspectPortalHostContract({ appSource: value, authSource: '' });
    expect(result.status).toBe('INVALID_SOURCE_INPUT');
    expect(result.installationAuthorized).toBe(false);
  }
});
test('textual permission and tenant references do not certify isolation', () => {
  const result = inspectPortalHostContract({
    appSource, authSource, routeSource: 'authorizeOperation tenantColumn organization_id'
  });
  expect(result.findings.find(item => item.id === 'host-tenant-isolation-reference').status)
    .toBe('STATIC_REFERENCE_FOUND');
  expect(result.effectiveTenantIsolationVerified).toBe(false);
  expect(result.publicationAuthorized).toBe(false);
});
