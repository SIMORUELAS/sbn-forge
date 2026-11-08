# Macro-bloque 8AE — Offline PostgreSQL provisioning procedure

The new `studio/linux-postgres-provisioning-plan.js` composes the existing 8AD database-boundary assessment and produces a **non-executable review plan**. It cannot create a database, create roles, connect, issue SQL, set authorization markers, or approve integration tests.

## Separation of responsibilities
- **Inspection identity:** restricted, read-only, no schema/database creation; approved independently and connected to maintenance database `postgres` for 8AC review.
- **Provisioning administrator:** separately authorized operator responsible for infrastructure/network, database creation, access controls, backups, and a change window. This module provides no provisioning commands.
- **Execution identity:** future dedicated non-superuser constrained to `sbn_forge_execution_test`. Any required schema creation must be explicitly scoped and must not grant ownership of the database or authorization marker. This remains a design proposal.

## Preconditions for independent approval
1. Verify network perimeter and effective PostgreSQL HBA scope, not merely UFW status.
2. Validate TLS certificate trust and hostname verification; TLS encryption alone is insufficient.
3. Verify tested backup restore, restore owner, recovery targets, and resource contention with Plesk/SBN Portal workloads.
4. Approve database and role separation, least-privilege permissions, and an explicit change window.
5. Review audit, stop, access revocation, and rollback plan; never alter or drop existing Portal databases.

The 8AC field evidence remains partial. Even if all checklist flags are asserted, the maximum status is `PROCEDURE_READY_FOR_ADMINISTRATOR_REVIEW`, **not authorization**.

## Local validation
```powershell
git pull --ff-only
npm run lint
npm test
git status --short
```

Do not run SSH, pgAdmin, or Plesk changes for this software-only macro-block.
