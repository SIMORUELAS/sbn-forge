# Portal CRUD bridge: offline integration only

The bridge in `studio/portal-crud-security-bridge.js` composes the verified-JWT host callback, the proposed organization membership and role-option policy, and the existing fail-closed guard. It clears any preexisting request security context, then produces an immutable `request.tenantContext.organizationId` only after authorization. No Portal backend, database, server route or generator template is modified.

The actual Portal schema uses UUID organizations and integer user/option IDs. The `actions` JSON field is unconstrained by its Zod schema: `list/read/create/update/delete` remains an explicit proposed mapping, not a confirmed Portal-wide convention. Delegations are not granted access.

**Boundary:** creating a request tenant context does not guarantee tenant isolation in SQL. The generated repository's tenant column must be mapped and independently enforced in each CRUD query; integration and negative cross-tenant tests are still required. This bridge cannot certify installation or publication. All injected host functions and database reads must be trusted and reviewed before any real wiring.

Consolidated local check:

```powershell
Set-Location "C:\\PROYECTOS WEB 2026\\SBN\\sbn-forge-studio"
git pull --ff-only
git log -1 --oneline
npm run lint
npm test
git status --short
```
