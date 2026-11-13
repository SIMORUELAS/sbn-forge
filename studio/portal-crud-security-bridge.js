'use strict';

const { createPortalOrganizationPolicy } = require('./portal-organization-policy');
const { createPortalSecurityAdapter } = require('./portal-security-adapter');

// Offline bridge. A real host must supply verified JWT middleware, a trusted
// read-only query function and a reviewed option ID for this specific module.
function createPortalCrudSecurityBridge({ verifyJWT, query, optionId } = {}) {
  const policy = createPortalOrganizationPolicy({ query, optionId });
  const adapter = createPortalSecurityAdapter({
    verifyJWT,
    resolveOrganization: policy.resolveOrganization,
    authorizeOperation: policy.authorizeOperation
  });

  function preHandler(operation) {
    const guard = adapter.guard(operation);
    return async (request, reply) => {
      // Never inherit a client- or earlier-handler-supplied security context.
      delete request.portalSecurityContext;
      delete request.tenantContext;
      await guard(request, reply);
      if (reply.sent || reply.statusCode >= 400) { return; }
      const context = request.portalSecurityContext;
      if (!context || context.operation !== operation ||
          typeof context.organizationId !== 'string') {
        return reply.code(403).send({ code: 'TENANT_CONTEXT_REQUIRED' });
      }
      // The generated repository must independently enforce this tenant scope
      // in every SQL operation. This bridge alone does not prove SQL isolation.
      request.tenantContext = Object.freeze({
        organizationId: context.organizationId
      });
    };
  }
  return Object.freeze({
    preHandler,
    installable: false,
    publicationAuthorized: false,
    tenantSqlCertified: false
  });
}
module.exports = { createPortalCrudSecurityBridge };
