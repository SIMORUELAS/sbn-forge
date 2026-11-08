# Macro-bloque 8AF — Consolidated offline readiness assessment

`studio/linux-postgres-readiness-certification.js` combines the existing **8AC SSH/pgAdmin review**, **8AD isolation assessment**, and **8AE provisioning plan** without connecting to any host or database.

## Decision categories
- `CERTIFICATION_BLOCKED`: invalid or missing trusted inventory, rejected database destination, or isolation policy blocker.
- `CERTIFICATION_INCOMPLETE`: incomplete SSH/pgAdmin inspection, missing confirmations, or incomplete procedure.
- `DESIGN_READY_FOR_INDEPENDENT_REVIEW`: all manually asserted inputs are favorable. **This is not proof of independent verification or authorization.**

No result grants database provisioning, role creation, SQL execution, or integration testing. The result includes only curated statuses, missing checks, and blockers. Raw SSH/pgAdmin output, hostnames, passwords, and connection strings must not be passed to reports.

## Current deployment decision
The field evidence recorded for SIMOTECNOLOGIAS in 8AC remains **incomplete**: inspection used an administrative PostgreSQL identity and the wrong database for the restricted maintenance inspection. TLS certificate identity, network perimeter, backups, and independent approvals remain unverified. **Do not construct a favorable input object from these observations.** No changes to `postgres`, `sbn_portal_test`, or other existing databases are authorized.

## Local validation
```powershell
git pull --ff-only
npm run lint
npm test
git status --short
```

This software-only assessment requires no SSH, pgAdmin, or Plesk actions.
