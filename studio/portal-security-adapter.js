'use strict';

// Host-neutral fail-closed adapter. No database or Portal dependency is imported.
// The host must supply trusted functions; never authorize from client headers.
const OPERATIONS = Object.freeze(['list', 'read', 'create', 'update', 'delete']);
function createPortalSecurityAdapter({ verifyJWT, resolveOrganization, authorizeOperation } = {}) {
  if (typeof verifyJWT !== 'function' ||
      typeof resolveOrganization !== 'function' ||
      typeof authorizeOperation !== 'function') {
    throw new Error('PORTAL_SECURITY_ADAPTER_INCOMPLETE');
  }
  function guard(operation) {
    if (!OPERATIONS.includes(operation)) { throw new Error('INVALID_CRUD_OPERATION'); }
    return async (request, reply) => {
      try {
        await verifyJWT(request, reply);
        if (reply.sent || reply.statusCode >= 400) { return; }
        const userId = request.user?.id;
        if ((typeof userId !== 'string' && typeof userId !== 'number') ||
            String(userId).trim() === '') {
          return reply.code(401).send({ code: 'AUTHENTICATION_REQUIRED' });
        }
        const organizationId = await resolveOrganization({ request, userId });
        if ((typeof organizationId !== 'string' && typeof organizationId !== 'number') ||
            String(organizationId).trim() === '') {
          return reply.code(403).send({ code: 'ORGANIZATION_CONTEXT_REQUIRED' });
        }
        const permitted = await authorizeOperation({ request, userId, organizationId, operation });
        if (permitted !== true) {
          return reply.code(403).send({ code: 'PERMISSION_DENIED' });
        }
        request.portalSecurityContext = Object.freeze({ userId, organizationId, operation });
      } catch {
        if (!reply.sent) {
          return reply.code(403).send({ code: 'SECURITY_VERIFICATION_FAILED' });
        }
      }
    };
  }
  return Object.freeze({ guard, operations: [...OPERATIONS], installable: false, publicationAuthorized: false });
}
module.exports = { createPortalSecurityAdapter };
