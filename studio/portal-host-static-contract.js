'use strict';

// Static integration inventory. It deliberately does not execute or import
// untrusted host source and never treats source markers as runtime evidence.
const LIMIT = 512 * 1024;
const REQUIRED = Object.freeze([
  'jwtVerification', 'trustedIdentity', 'operationAuthorization',
  'organizationContext', 'tenantQueryIsolation', 'hostDependencyCompatibility',
  'routeConflictReview', 'migrationReview'
]);

function inspectPortalHostContract({ appSource, authSource, routeSource = '' } = {}) {
  const sources = [appSource, authSource, routeSource];
  if (sources.some(source => typeof source !== 'string' ||
      Buffer.byteLength(source, 'utf8') > LIMIT)) {
    return {
      status: 'INVALID_SOURCE_INPUT', findings: [], pending: [...REQUIRED],
      installationAuthorized: false, publicationAuthorized: false
    };
  }
  const observations = [
    ['jwt-plugin', /register\(jwtPlugin\)/.test(appSource)],
    ['jwt-middleware', /async function verifyJWT\(/.test(authSource) &&
      /await request\.jwtVerify\(\)/.test(authSource)],
    ['jwt-error-denial', /reply\.code\(401\)/.test(authSource)],
    ['forge-route-registry', /registerForgeRoutes/.test(appSource)],
    ['forge-route-prefix', /registerForgeRoutes\s*,\s*\{\s*prefix:\s*['"]\/api['"]/.test(appSource)],
    ['global-audit-hook', /fastify\.addHook\(['"]onRequest['"]/.test(appSource) &&
      /request\.userLog/.test(appSource)],
    ['global-audit-hook-catches-jwt-error', /request\.userLog\s*=\s*null/.test(appSource)],
    ['host-operation-authorization-reference', /authorizeOperation|requireCrudPermissions/.test(routeSource)],
    ['host-tenant-isolation-reference', /tenantColumn|organization_id/.test(routeSource)]
  ];
  const findings = observations.map(([id, observed]) => ({
    id, status: observed ? 'STATIC_REFERENCE_FOUND' : 'NOT_OBSERVED'
  }));
  return {
    status: 'STATIC_REVIEW_ONLY',
    findings,
    pending: [...REQUIRED],
    warning: 'Global JWT audit logging does not enforce authentication. Host middleware must be applied to each generated operation and verified at runtime.',
    hostJwtMiddlewareRecommended: 'src/middlewares/auth.js#verifyJWT',
    hostRouteRegistryObserved: observations[3][1],
    effectiveAuthenticationVerified: false,
    effectiveAuthorizationVerified: false,
    effectiveTenantIsolationVerified: false,
    integrationTestsExecuted: false,
    installationAuthorized: false,
    publicationAuthorized: false
  };
}

module.exports = { inspectPortalHostContract };
