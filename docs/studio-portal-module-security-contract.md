# Studio — Portal module security integration contract

This first security-integration block adds a pure offline assessment, `assessPortalModuleSecurityContract`, for generated modules intended for SBN Portal.

It reuses the established generator design: `src/templates/backend/routes.hbs` already contains optional JWT and CRUD permission hooks and fail-closed tenant isolation requirements; `studio/generated-security-inspector.js` reports static observations as `unknown`; and `studio/security-certification.js` explicitly blocks installation without trusted artifact-specific evidence. These mechanisms must not be bypassed or duplicated.

The new contract requires all five CRUD operations plus eight host integration requirements: JWT verification, trusted identity, per-operation authorization, organization context, tenant query isolation, host dependency compatibility, route conflict review, and migration review. Evidence references are sanitized; raw credentials and host data are not returned.

Even when all review claims are present, the result is **design ready for independent review only**, never an installation approval or a runtime certification. A claim does not establish JWT execution, tenant predicates or permission enforcement.

## Next implementation boundary

To move beyond design review, the actual SBN Portal host adapter and generated module must be tested together in an isolated environment, including unauthorized requests, cross-organization access, route conflicts and migrations. This block does not change the portal, generated templates, server routes, or production PostgreSQL.

## Local validation

```powershell
git pull --ff-only
git log -1 --oneline
npm run lint
npm test
git status --short
```
