# SBN Forge Studio — SBN Portal host security integration inventory

## Inspected sources (GitHub, read-only)

Repository: `SIMORUELAS/sbnportal-apis`, branch `feature/ai-tasks-transactional-security`.

- `src/middlewares/auth.js`: exports `verifyJWT`; calls `request.jwtVerify()`; responds 401 on failure. This is the appropriate existing authentication entrypoint to assess for generated routes.
- `src/app.js`: registers `jwtPlugin` and `registerForgeRoutes` under `/api`. Its global `onRequest` hook catches JWT failures and sets `request.userLog = null`. This hook is for audit enrichment, not an authentication boundary.
- The inspected files do not demonstrate per-operation authorization or tenant isolation for a specific generated module.

## New Forge capability

`studio/portal-host-static-contract.js` exports `inspectPortalHostContract`. It accepts source text, performs bounded read-only static observations, and returns an inventory. It never imports or executes Portal code, connects to a database, or installs anything. It explicitly marks authentication, authorization, tenant isolation, integration tests, installation and publication as unverified/disabled.

This is an **offline integration research component**, not a host adapter connected to runtime, and is not wired into the Studio web interface yet. Do not mark any of the eight existing security requirements as passed based on textual matches.

## Next phase

Develop an isolated Fastify host-adapter integration test that verifies JWT denial, operation-specific permissions, cross-organization SQL restrictions, and route registration. Use the real Portal contract only after inspecting its authorization and organization-context mechanisms. No production host changes without separate authorization.

## Local validation

```powershell
git pull --ff-only
git log -1 --oneline
npm run lint
npm test
git status --short
```
