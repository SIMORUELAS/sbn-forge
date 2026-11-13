'use strict';

// Offline adapter to existing SBN Portal table contracts. No database connection
// is created here; the caller supplies a trusted read-only query interface.
const OPERATIONS = Object.freeze(['list', 'read', 'create', 'update', 'delete']);
const INTEGER_ID = /^[1-9][0-9]{0,14}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MEMBER_ROLES = new Set(['owner', 'admin', 'member', 'viewer']);
const ROLE_CODE = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/;

function numericId(value) {
  const str = typeof value === 'number' && Number.isSafeInteger(value)
    ? String(value) : typeof value === 'string' ? value : '';
  return INTEGER_ID.test(str) ? str : null;
}
function organizationUuid(value) {
  return typeof value === 'string' && UUID.test(value) ? value.toLowerCase() : null;
}
function roleCode(value) {
  return typeof value === 'string' && ROLE_CODE.test(value) ? value : null;
}
function createPortalOrganizationPolicy({ query, optionId } = {}) {
  const option = numericId(optionId);
  if (typeof query !== 'function' || !option) {
    throw new Error('PORTAL_ORGANIZATION_POLICY_INCOMPLETE');
  }
  async function resolveOrganization({ request, userId }) {
    const user = numericId(userId);
    // This is a selection hint only. Membership is always verified server-side.
    const selected = organizationUuid(request?.headers?.['x-organization-id']);
    if (!user || !selected) { return null; }
    const result = await query(
      'SELECT organization_id, role, status FROM public.organization_users WHERE organization_id = $1 AND user_id = $2 LIMIT 1',
      [selected, user]
    );
    const rows = result?.rows;
    if (!Array.isArray(rows) || rows.length !== 1) { return null; }
    const member = rows[0];
    if (organizationUuid(member.organization_id) !== selected ||
        member.status !== 'active' || !MEMBER_ROLES.has(member.role)) { return null; }
    return selected;
  }
  async function authorizeOperation({ userId, organizationId, operation }) {
    const user = numericId(userId);
    const organization = organizationUuid(organizationId);
    if (!user || !organization || !OPERATIONS.includes(operation)) { return false; }
    // Membership is checked again to prevent caller-supplied role escalation.
    const membership = await query(
      'SELECT organization_id, role, status FROM public.organization_users WHERE organization_id = $1 AND user_id = $2 LIMIT 1',
      [organization, user]
    );
    const rows = membership?.rows;
    if (!Array.isArray(rows) || rows.length !== 1 ||
        organizationUuid(rows[0].organization_id) !== organization ||
        rows[0].status !== 'active') { return false; }
    const role = roleCode(rows[0].role);
    if (!role || !MEMBER_ROLES.has(role)) { return false; }
    const permissions = await query(
      'SELECT organization_id, role_code, option_id, allow, actions FROM public.role_option_permissions WHERE organization_id = $1 AND role_code = $2 AND option_id = $3 LIMIT 1',
      [organization, role, option]
    );
    const matches = permissions?.rows;
    if (!Array.isArray(matches) || matches.length !== 1) { return false; }
    const permission = matches[0];
    if (organizationUuid(permission.organization_id) !== organization ||
        roleCode(permission.role_code) !== role ||
        numericId(permission.option_id) !== option ||
        permission.allow !== true ||
        !permission.actions || typeof permission.actions !== 'object' ||
        Array.isArray(permission.actions)) { return false; }
    return permission.actions[operation] === true;
  }
  return Object.freeze({ resolveOrganization, authorizeOperation,
    installationAuthorized: false, publicationAuthorized: false });
}
module.exports = { createPortalOrganizationPolicy };
