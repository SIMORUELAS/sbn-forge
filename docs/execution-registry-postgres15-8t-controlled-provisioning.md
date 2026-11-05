# Macro-block 8T — Controlled provisioning blueprint (NO EXECUTION)

**State: PREPARED ONLY.** This blueprint is not authorization to create Windows accounts, modify ACLs, initialize clusters, register services, create databases or enable integration tests.

## Proposed resource manifest

| Resource | Proposed value | Guard |
|---|---|---|
| PostgreSQL version | 15 (installed binaries) | Check binary version before use |
| Existing Windows service | `postgresql-x64-15` | Observe only; never stop/reconfigure |
| Existing TCP port | 5432 | Observe only; verify before/after |
| New Windows service | `postgresql-sbn-forge-test` | Must not already exist |
| New TCP port | 5433 | Must be free on IPv4 and IPv6 |
| New data directory | `C:\SBN\PostgreSQL15-Forge-Test` | Must be absent, no reparse-point path |
| New database | `sbn_forge_execution_test` | New cluster only |
| New SQL runner | `sbn_forge_test_runner` | Non-superuser; minimum rights |
| Marker table | `public.sbn_forge_execution_registry_test_authorization` | Independent owner; `enabled=false` |

The dedicated non-admin Windows service account **is not selected yet**. Do not guess a username, password, service SID or filesystem permissions.

## Stage 0 — Independent administrative approval

Require written approval of: host/maintenance window; exact dedicated service identity; service-logon rights; NTFS owner and ACEs; log and backup locations; minimum disk capacity and retention; credential delivery method; loopback-only network and SCRAM settings; recovery and rollback owner. Record authorization **outside the repository**; do not store secrets or personal identifiers in Git.

Stop if any item is unresolved. Approval for installation does not approve enabling the integration-test marker or running tests.

## Stage 1 — Baseline and collision detection (read-only)

Run `Test-SbnForgePostgres15Prerequisites.ps1` and `Test-SbnForgePostgres15SecurityReadiness.ps1`; review all PASS/BLOCKED items, not only summary JSON. Independently inspect existing service identity, original cluster health, port 5432 listener, free space, parent NTFS ACLs, reparse points and whether proposed service/port/data directory are unused. Do not convert human review gates to PASS programmatically.

## Stage 2 — Windows identity and filesystem (future approved operation only)

An authorized Windows administrator creates or selects a dedicated least-privilege service identity and grants only required service-logon rights. Prepare the new data/log directories with explicit ownership and restricted ACLs. The account may read/execute installed PostgreSQL 15 binaries but must have **no access to the original cluster data directory**. Abort if inheritance or policy cannot be verified. Do not use administrator or the existing PostgreSQL service identity for the new service.

## Stage 3 — PostgreSQL 15 cluster initialization (future approved operation only)

Use PostgreSQL 15 `initdb` under the dedicated service identity against **only the approved new empty directory**. Choose SCRAM password encryption and secure local authentication; never use `trust`. Supply bootstrap credentials through an approved protected channel, not plaintext command arguments or tracked files. Fail closed on any pre-existing data or ambiguous path.

## Stage 4 — Configuration and service registration (future approved operation only)

Configure only the new cluster: port `5433`, `listen_addresses` limited to `127.0.0.1` (and `::1` if explicitly verified), explicit loopback `pg_hba.conf` with `scram-sha-256`, and restricted log path. Review authentication-rule ordering and absence of permissive fallback. Register `postgresql-sbn-forge-test` with its dedicated identity and start only that service. Stop if port 5432 or the existing service changes unexpectedly.

## Stage 5 — Restricted database and authorization marker (future approved operation only)

Connect **explicitly to port 5433** as the new cluster administrator. Confirm cluster identity and endpoint before SQL. Create only `sbn_forge_execution_test`, a restricted runner and an independently owned marker table with the exact purpose `execution-registry-integration` and `enabled=false`. Revoke broad default privileges where necessary in the **new** cluster. The runner must not own the marker, modify its rows, or have SUPERUSER, CREATEDB, CREATEROLE, REPLICATION or BYPASSRLS. Align runner/schema privileges with the existing `execution-registry-environment-preflight.js` and `execution-registry-test-guard.js`; do not weaken those guards.

## Stage 6 — Verification (read-only until independently authorized tests)

- Confirm service `postgresql-x64-15` remains running and port 5432 remains bound as before.
- Confirm only the new service uses port 5433 and the new cluster listens on loopback.
- Confirm PostgreSQL 15 version, database identity, runner privilege restrictions, independent marker owner and disabled marker.
- Run existing read-only registry environment preflight. If any check fails, do not enable marker or run integration tests.
- Record pass/fail and deviations without credentials or sensitive connection strings.

## Stop and recovery boundaries

Any collision, privilege escalation, unexpected network listener, wrong database endpoint, authentication weakness or effect on the original cluster is a hard stop. A future rollback may stop/unregister **only** the new service and remove **only** separately verified new resources, after a distinct rollback approval. No wildcard cleanup, automatic deletion, or restoration of original-cluster resources is allowed. Refer to `execution-registry-postgres15-8s-security-and-recovery.md`.

## Acceptance for 8T

- One integrated stage-by-stage provisioning blueprint exists in GitHub.
- All state-changing operations are explicitly future/approval-gated; no executable installer is published in this block.
- The 5432 original cluster and existing 15 databases remain out of scope.
- Marker activation and the three PostgreSQL integration tests remain separately gated.

## Macro-block 8U — read-only provisioning orchestrator

The first version of `scripts/Invoke-SbnForgePostgres15Provisioning.ps1` supports
**only** `Plan` and `Preflight`. There is deliberately no `Install` mode.

```powershell
& ".\scripts\Invoke-SbnForgePostgres15Provisioning.ps1" -Mode Plan
& ".\scripts\Invoke-SbnForgePostgres15Provisioning.ps1" -Mode Preflight
```

`Plan` emits the proposed resource manifest and pending approval gates.
`Preflight` invokes both read-only diagnostics from 8Q and 8R and reports
blocked controls; it does not approve or install anything. No secret or
connection string is required. The tool always reports
`ProvisioningAuthorized=false`, `ProvisioningPerformed=false`, and
`TestExecutionAuthorized=false`. Any missing or failing diagnostic blocks
progress. A future state-changing implementation requires a separately
reviewed design and explicit administrator approval.
