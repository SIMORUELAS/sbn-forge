# SBN Forge Studio — isolated Portal operation guard

Inspected read-only in `SIMORUELAS/sbnportal-apis` on `feature/ai-tasks-transactional-security`:

- `src/middlewares/auth.js` exports `verifyJWT`, calling `request.jwtVerify()` and returning HTTP 401 on failure.
- `src/modules/role_option_permissions/role_option_permissions.routes.js` applies `preHandler: verifyJWT` to its routes.
- `src/modules/accounts_organization_modules/accounts_organization_modules.routes.js` also applies JWT verification, but the controller's use of organization IDs from request parameters/body does **not** prove cross-organization authorization.
- `src/plugins/jwt.js` registers `@fastify/jwt`.
- These observations do not establish a reusable authorization policy or trusted organization resolver for generated modules.

`studio/portal-security-adapter.js` adds a host-neutral, offline guard factory. The host must explicitly supply `verifyJWT`, `resolveOrganization` and `authorizeOperation`. Each of the five CRUD operations independently requires JWT, trusted user identity, trusted organization context, and an explicit `true` permission result. Header-supplied organization IDs are never trusted by the adapter. Missing dependencies, exceptions and denied permissions fail closed.

**Important boundary:** This is an isolated adapter with unit tests, not yet wired into generated routes or Portal runtime. The trusted resolver and permission service have not been identified or implemented. Repository SQL tenant filtering is a separate mandatory control; request guards alone cannot certify tenant isolation. Neither installation nor publication is authorized.

Local validation:

```powershell
git pull --ff-only
git log -1 --oneline
npm run lint
npm test
git status --short
```
