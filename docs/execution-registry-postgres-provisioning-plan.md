> **Decision update (macro-block 8P):** The existing localhost:5432 cluster has PUBLIC CONNECT on all 15 databases. Do not provision the execution runner in that cluster. The preferred, documentation-only plan is a separate PostgreSQL 15 cluster on localhost:5433: [isolated-instance runbook](execution-registry-postgres15-isolated-instance-runbook.md). The legacy steps below are retained as historical context and are **not approved for execution**.

# SBN Forge — PostgreSQL 15 test provisioning plan (NOT authorized to execute)

## Scope and hold point

Target is the previously inventoried PostgreSQL 15 server at localhost:5432.
Proposed NEW database: `sbn_forge_execution_test`. Proposed NEW login:
`sbn_forge_test_runner`. The existing 15 databases and existing roles must
remain unchanged. This document is a plan, **not an executable migration**.
Do not provision, run DDL, change pg_hba.conf or activate the marker without
separate explicit operator authorization after reviewing the audit results.

## Phase A — read-only evidence

Run `docs/execution-registry-postgres-access-audit.sql` against `postgres`
with an authorized administrator. Verify instance identity, database and role
name non-collision, and `PUBLIC CONNECT/CREATE/TEMP` grants on ALL databases.
Confirm this is a non-production host and record a recovery/backup plan.
The database name containing `test` is not evidence of isolation.

**Critical:** PostgreSQL roles are cluster-wide. A new LOGIN inherits PUBLIC
privileges on existing databases; a fresh login does not imply database
isolation. If existing databases grant PUBLIC CONNECT, do **not** revoke
PUBLIC on operational databases without a separately reviewed impact analysis.
Prefer a separate PostgreSQL instance when access isolation cannot be proven
without changing existing database grants. Database-level CONNECT restrictions
alone do not establish network or operating-system isolation.

## Phase B — proposed provisioning (separate approval required)

1. Independently verify backups, server identity, existing privileges and
   collisions. Confirm no changes to existing databases are needed.
2. Have an administrator create the new test database, retaining ownership
   outside the runner role, and a dedicated NO-SUPERUSER, NO-CREATEDB,
   NO-CREATEROLE, NO-REPLICATION, NO-BYPASSRLS LOGIN with a secret supplied
   out of band. Do not put passwords in SQL files or Git history.
3. Constrain the runner's effective CONNECT on existing databases using an
   independently reviewed approach. **Stop** if this would require changing
   grants or authentication policy on operational databases without approval.
4. In the new test database only, independently create the authorization
   marker with `enabled=false` initially; keep its owner outside the runner
   and grant the runner SELECT only. The runner must not have CREATE on public.
5. Grant CREATE on the test database as required by the existing suite to
   initialize the `forge_security` schema. Validate that the runner is not
   a member of the database or marker owner roles.
6. Before setting the marker to enabled, independently review test host,
   permissions, network exposure and isolation evidence. Enabling the marker
   and setting the explicit execution approval require separate authorization.
7. Run the existing read-only preflight. Only after approval, run
   `node studio/authorized-execution-registry-integration.js`. The tests
   create test-only schema/tables and temporary runner records.

## Stop conditions

Stop if the target database/role exists unexpectedly; PUBLIC privileges on
operational databases cannot be isolated; instance identity is uncertain;
privilege checks fail; or any change to existing databases is required.
Do not silently alter existing grants or weaken the fail-closed preflight.
No certification, installation, SMTP, or production deployment is authorized.
