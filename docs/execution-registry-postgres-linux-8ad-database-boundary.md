# Macro-bloque 8AD — PostgreSQL database boundary (offline only)

This adds `studio/linux-postgres-database-boundary.js` as an **offline, fail-closed design review** layered on the existing `assessLinuxIsolation` assessment. It does not alter the database, create users, load credentials, connect to PostgreSQL, or authorize integration.

## Boundary
- Proposed target name: `sbn_forge_execution_test` **only**.
- Explicitly protected: `postgres`, `template0`, `template1`, `sbn_portal_test`.
- Reject any other destination, any proposal using an administrative role, or any proposal that does not explicitly exclude cross-database access.
- An explicit administrator confirmation checklist covers host approval, network restrictions, TLS certificate identity, tested backup restoration, existing-database protection, dedicated DB approval, restricted runner approval, and shared-resource impact.
- These flags are **claims requiring independent verification**; setting all to true never grants permission. A favorable result means only `BOUNDARY_DESIGN_READY_FOR_INDEPENDENT_REVIEW`.

## Current SIMOTECNOLOGIAS status
8AC observations are recorded in `docs/execution-registry-postgres-linux-8ac-field-evidence-2026-11-07.md`. Restricted inspection identity, effective network perimeter, certificate identity verification, and recoverable backups remain unconfirmed. **No real integration is approved.** The server may host other workloads; do not assume a shared PostgreSQL cluster is acceptable.

## Local consolidated validation
```powershell
git pull --ff-only
npm run lint
npm test
git status --short
```

No SSH or pgAdmin commands are needed for this software-only block. Separate administrative authorization and an independently reviewed provisioning procedure are prerequisites for future server changes.
